import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';

// --- Mocks (must be before imports) ---

vi.mock('../../src/config/supabase.js', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../../src/services/airdrop.service.js', () => ({
  airdropService: {
    resolveAudience: vi.fn(),
    buildFundEscrowTx: vi.fn(),
    estimateFees: vi.fn(),
  },
}));

vi.mock('../../src/jobs/queues.js', () => ({
  addJob: vi.fn(),
}));

vi.mock('@solana/web3.js', async () => {
  const mockPublicKey = { toBase58: () => 'mockEscrowPubkey123' };
  return {
    Keypair: {
      generate: vi.fn(() => ({ publicKey: mockPublicKey, secretKey: new Uint8Array(64) })),
    },
    PublicKey: vi.fn().mockImplementation((key: string) => ({ toBase58: () => key })),
  };
});

// --- Imports ---

import { airdropController } from '../../src/controllers/airdrop.controller.js';
import { supabase } from '../../src/config/supabase.js';
import { airdropService } from '../../src/services/airdrop.service.js';
import { addJob } from '../../src/jobs/queues.js';
import { AppError } from '../../src/middleware/errorHandler.js';
import { AuthenticatedRequest } from '../../src/types/index.js';

// --- Helpers ---

function createChain(terminalResult: { data?: unknown; error?: unknown }) {
  const chain: Record<string, any> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'lt', 'gte', 'order', 'limit', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(terminalResult);
  // Make chain thenable for non-single terminal calls
  chain.then = (resolve: Function) => resolve(terminalResult);
  return chain;
}

function mockReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return { wallet: 'testWallet123', body: {}, params: {}, query: {}, headers: {}, ...overrides } as any;
}

function mockRes() {
  const res: any = { json: vi.fn(), status: vi.fn().mockReturnThis() };
  return res as Response;
}

// --- Tests ---

describe('airdropController', () => {
  const mockedFrom = vi.mocked(supabase.from);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== createCampaign ====================
  describe('createCampaign', () => {
    const validSplBody = {
      name: 'Test Campaign',
      type: 'spl_token',
      tokenMint: 'So11111111111111111111111111111111111111112',
      amountPerRecipient: 100,
      audienceType: 'followers',
    };

    it('should create spl_token campaign successfully', async () => {
      const campaignData = { id: 'camp-1', ...validSplBody, status: 'draft' };
      const chain = createChain({ data: campaignData, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ body: validSplBody });
      const res = mockRes();

      await airdropController.createCampaign(req, res);

      expect(mockedFrom).toHaveBeenCalledWith('airdrop_campaigns');
      expect(chain.insert).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: campaignData });
    });

    it('should reject empty name', async () => {
      const req = mockReq({ body: { ...validSplBody, name: '' } });
      const res = mockRes();

      await expect(airdropController.createCampaign(req, res)).rejects.toThrow(AppError);
      await expect(airdropController.createCampaign(req, res)).rejects.toThrow('Campaign name is required');
    });

    it('should reject missing name', async () => {
      const { name, ...noName } = validSplBody;
      const req = mockReq({ body: noName });
      const res = mockRes();

      await expect(airdropController.createCampaign(req, res)).rejects.toThrow(AppError);
    });

    it('should reject invalid type', async () => {
      const req = mockReq({ body: { ...validSplBody, type: 'nft' } });
      const res = mockRes();

      await expect(airdropController.createCampaign(req, res)).rejects.toThrow('Type must be spl_token or cnft');
    });

    it('should reject invalid audienceType', async () => {
      const req = mockReq({ body: { ...validSplBody, audienceType: 'everyone' } });
      const res = mockRes();

      await expect(airdropController.createCampaign(req, res)).rejects.toThrow('Invalid audience type');
    });

    it('should require tokenMint for spl_token', async () => {
      const req = mockReq({ body: { ...validSplBody, tokenMint: undefined } });
      const res = mockRes();

      await expect(airdropController.createCampaign(req, res)).rejects.toThrow('Token mint is required for SPL token airdrops');
    });

    it('should require positive amountPerRecipient for spl_token', async () => {
      const req = mockReq({ body: { ...validSplBody, amountPerRecipient: 0 } });
      const res = mockRes();

      await expect(airdropController.createCampaign(req, res)).rejects.toThrow('Amount per recipient must be positive');
    });

    it('should accept cnft type without tokenMint', async () => {
      const cnftBody = {
        name: 'CNFT Drop',
        type: 'cnft',
        audienceType: 'tippers',
        metadataUri: 'https://arweave.net/abc',
      };
      const campaignData = { id: 'camp-2', ...cnftBody, status: 'draft' };
      const chain = createChain({ data: campaignData, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ body: cnftBody });
      const res = mockRes();

      await airdropController.createCampaign(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: campaignData });
    });

    it('should throw 500 on supabase insert error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ body: validSplBody });
      const res = mockRes();

      await expect(airdropController.createCampaign(req, res)).rejects.toThrow('Failed to create campaign');
    });
  });

  // ==================== getMyCampaigns ====================
  describe('getMyCampaigns', () => {
    it('should return campaigns for wallet', async () => {
      const campaigns = [{ id: 'c1', name: 'Camp 1' }, { id: 'c2', name: 'Camp 2' }];
      const chain = createChain({ data: campaigns, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq();
      const res = mockRes();

      await airdropController.getMyCampaigns(req, res);

      expect(mockedFrom).toHaveBeenCalledWith('airdrop_campaigns');
      expect(chain.eq).toHaveBeenCalledWith('creator_wallet', 'testWallet123');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { campaigns } });
    });

    it('should return empty array when no campaigns', async () => {
      const chain = createChain({ data: null, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq();
      const res = mockRes();

      await airdropController.getMyCampaigns(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { campaigns: [] } });
    });
  });

  // ==================== getReceivedDrops ====================
  describe('getReceivedDrops', () => {
    it('should return received drops for wallet', async () => {
      const drops = [{ id: 'r1', wallet: 'testWallet123', airdrop_campaigns: { name: 'Camp' } }];
      const chain = createChain({ data: drops, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq();
      const res = mockRes();

      await airdropController.getReceivedDrops(req, res);

      expect(mockedFrom).toHaveBeenCalledWith('airdrop_recipients');
      expect(chain.select).toHaveBeenCalledWith('*, airdrop_campaigns(*)');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { drops } });
    });

    it('should throw 500 on error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq();
      const res = mockRes();

      await expect(airdropController.getReceivedDrops(req, res)).rejects.toThrow('Failed to fetch received drops');
    });
  });

  // ==================== getCampaign ====================
  describe('getCampaign', () => {
    it('should return campaign with recipient breakdown', async () => {
      const campaign = { id: 'camp-1', name: 'Test', status: 'processing' };
      const recipients = [{ status: 'pending' }, { status: 'sent' }, { status: 'sent' }, { status: 'failed' }];

      const campaignChain = createChain({ data: campaign, error: null });
      const recipientChain = createChain({ data: recipients, error: null });

      mockedFrom.mockImplementation((table: string) => {
        if (table === 'airdrop_campaigns') return campaignChain as any;
        if (table === 'airdrop_recipients') return recipientChain as any;
        return campaignChain as any;
      });

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await airdropController.getCampaign(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { ...campaign, breakdown: { pending: 1, sent: 2, failed: 1 } },
      });
    });

    it('should throw 404 when not found', async () => {
      const chain = createChain({ data: null, error: { message: 'not found' } });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'nonexistent' } as any });
      const res = mockRes();

      await expect(airdropController.getCampaign(req, res)).rejects.toThrow('Campaign not found');
    });

    it('should correctly count pending/sent/failed recipients', async () => {
      const campaign = { id: 'camp-1', name: 'Test' };
      const recipients = [
        { status: 'pending' }, { status: 'pending' }, { status: 'pending' },
        { status: 'sent' },
        { status: 'failed' }, { status: 'failed' },
      ];

      const campaignChain = createChain({ data: campaign, error: null });
      const recipientChain = createChain({ data: recipients, error: null });

      mockedFrom.mockImplementation((table: string) => {
        if (table === 'airdrop_campaigns') return campaignChain as any;
        if (table === 'airdrop_recipients') return recipientChain as any;
        return campaignChain as any;
      });

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await airdropController.getCampaign(req, res);

      const jsonCall = (res.json as any).mock.calls[0][0];
      expect(jsonCall.data.breakdown).toEqual({ pending: 3, sent: 1, failed: 2 });
    });
  });

  // ==================== prepareCampaign ====================
  describe('prepareCampaign', () => {
    const splCampaign = {
      id: 'camp-1',
      creator_wallet: 'testWallet123',
      status: 'draft',
      type: 'spl_token',
      token_mint: 'TokenMint111',
      amount_per_recipient: 50,
      audience_type: 'followers',
      audience_filter: null,
    };

    it('should resolve audience, insert recipients, return preparation data', async () => {
      const wallets = ['w1', 'w2', 'w3'];
      const chain = createChain({ data: splCampaign, error: null });
      mockedFrom.mockReturnValue(chain as any);

      vi.mocked(airdropService.resolveAudience).mockResolvedValue(wallets);
      vi.mocked(airdropService.estimateFees).mockReturnValue(0.015);
      vi.mocked(airdropService.buildFundEscrowTx).mockResolvedValue({ transaction: 'base64tx' } as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await airdropController.prepareCampaign(req, res);

      expect(airdropService.resolveAudience).toHaveBeenCalledWith('testWallet123', 'followers', null);
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.insert).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          recipientCount: 3,
          totalTokensNeeded: 150,
          estimatedFeeSOL: 0.015,
          fundTransaction: 'base64tx',
        },
      });
    });

    it('should throw 404 for non-existent campaign', async () => {
      const chain = createChain({ data: null, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'nonexistent' } as any });
      const res = mockRes();

      await expect(airdropController.prepareCampaign(req, res)).rejects.toThrow('Campaign not found');
    });

    it('should throw 403 when not campaign owner', async () => {
      const chain = createChain({ data: { ...splCampaign, creator_wallet: 'otherWallet' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await expect(airdropController.prepareCampaign(req, res)).rejects.toThrow('Not the campaign owner');
    });

    it('should throw 400 for non-draft status', async () => {
      const chain = createChain({ data: { ...splCampaign, status: 'funded' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await expect(airdropController.prepareCampaign(req, res)).rejects.toThrow('Campaign must be in draft status to prepare');
    });

    it('should throw 400 when no recipients found', async () => {
      const chain = createChain({ data: splCampaign, error: null });
      mockedFrom.mockReturnValue(chain as any);
      vi.mocked(airdropService.resolveAudience).mockResolvedValue([]);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await expect(airdropController.prepareCampaign(req, res)).rejects.toThrow('No recipients found for the selected audience');
    });

    it('should return null fundTransaction for cnft type', async () => {
      const cnftCampaign = { ...splCampaign, type: 'cnft', token_mint: null, amount_per_recipient: null };
      const chain = createChain({ data: cnftCampaign, error: null });
      mockedFrom.mockReturnValue(chain as any);

      vi.mocked(airdropService.resolveAudience).mockResolvedValue(['w1', 'w2']);
      vi.mocked(airdropService.estimateFees).mockReturnValue(0.01);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await airdropController.prepareCampaign(req, res);

      expect(airdropService.buildFundEscrowTx).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          recipientCount: 2,
          totalTokensNeeded: 0,
          estimatedFeeSOL: 0.01,
          fundTransaction: null,
        },
      });
    });
  });

  // ==================== fundCampaign ====================
  describe('fundCampaign', () => {
    const draftCampaign = { id: 'camp-1', creator_wallet: 'testWallet123', status: 'draft' };

    it('should update to funded status with txSignature', async () => {
      const chain = createChain({ data: draftCampaign, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any, body: { txSignature: 'sig123' } });
      const res = mockRes();

      await airdropController.fundCampaign(req, res);

      expect(chain.update).toHaveBeenCalledWith({ status: 'funded', fund_tx_signature: 'sig123' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { funded: true } });
    });

    it('should reject missing txSignature', async () => {
      const req = mockReq({ params: { id: 'camp-1' } as any, body: {} });
      const res = mockRes();

      await expect(airdropController.fundCampaign(req, res)).rejects.toThrow('Transaction signature is required');
    });

    it('should reject non-owner', async () => {
      const chain = createChain({ data: { ...draftCampaign, creator_wallet: 'otherWallet' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any, body: { txSignature: 'sig123' } });
      const res = mockRes();

      await expect(airdropController.fundCampaign(req, res)).rejects.toThrow('Not the campaign owner');
    });

    it('should reject non-draft status', async () => {
      const chain = createChain({ data: { ...draftCampaign, status: 'funded' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any, body: { txSignature: 'sig123' } });
      const res = mockRes();

      await expect(airdropController.fundCampaign(req, res)).rejects.toThrow('Campaign must be in draft status to fund');
    });
  });

  // ==================== startCampaign ====================
  describe('startCampaign', () => {
    const fundedCampaign = { id: 'camp-1', creator_wallet: 'testWallet123', status: 'funded', total_recipients: 5 };

    it('should queue airdrop job and update to processing', async () => {
      const chain = createChain({ data: fundedCampaign, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await airdropController.startCampaign(req, res);

      expect(chain.update).toHaveBeenCalledWith({ status: 'processing' });
      expect(addJob).toHaveBeenCalledWith('airdrop', { campaignId: 'camp-1', creatorWallet: 'testWallet123' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { started: true, recipientCount: 5 } });
    });

    it('should reject non-funded status', async () => {
      const chain = createChain({ data: { ...fundedCampaign, status: 'draft' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await expect(airdropController.startCampaign(req, res)).rejects.toThrow('Campaign must be funded before starting');
    });

    it('should reject non-owner', async () => {
      const chain = createChain({ data: { ...fundedCampaign, creator_wallet: 'otherWallet' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await expect(airdropController.startCampaign(req, res)).rejects.toThrow('Not the campaign owner');
    });
  });

  // ==================== cancelCampaign ====================
  describe('cancelCampaign', () => {
    it('should cancel draft campaign', async () => {
      const chain = createChain({ data: { id: 'camp-1', creator_wallet: 'testWallet123', status: 'draft' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await airdropController.cancelCampaign(req, res);

      expect(chain.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { cancelled: true } });
    });

    it('should cancel funded campaign', async () => {
      const chain = createChain({ data: { id: 'camp-1', creator_wallet: 'testWallet123', status: 'funded' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await airdropController.cancelCampaign(req, res);

      expect(chain.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { cancelled: true } });
    });

    it('should reject completed campaign', async () => {
      const chain = createChain({ data: { id: 'camp-1', creator_wallet: 'testWallet123', status: 'completed' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await expect(airdropController.cancelCampaign(req, res)).rejects.toThrow('Cannot cancel a completed or already cancelled campaign');
    });

    it('should reject already cancelled campaign', async () => {
      const chain = createChain({ data: { id: 'camp-1', creator_wallet: 'testWallet123', status: 'cancelled' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await expect(airdropController.cancelCampaign(req, res)).rejects.toThrow('Cannot cancel a completed or already cancelled campaign');
    });

    it('should reject non-owner', async () => {
      const chain = createChain({ data: { id: 'camp-1', creator_wallet: 'otherWallet', status: 'draft' }, error: null });
      mockedFrom.mockReturnValue(chain as any);

      const req = mockReq({ params: { id: 'camp-1' } as any });
      const res = mockRes();

      await expect(airdropController.cancelCampaign(req, res)).rejects.toThrow('Not the campaign owner');
    });
  });
});
