import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '../../parking/lib/storage';

export type LinkedWallet = {
  id: string;
  name: string;
  detail: string;
  linked: boolean;
  color: string;
};

export type SavedCard = {
  id: string;
  label: string;
  type: string;
  last4: string;
};

type PaymentMethodsState = {
  wallets: LinkedWallet[];
  cards: SavedCard[];
  linkWallet: (id: string, detail: string) => void;
  unlinkWallet: (id: string) => void;
  addCard: (card: SavedCard) => void;
  removeCard: (id: string) => void;
};

const GCASH_DEFAULT_DETAIL = 'Approval still happens in the GCash app';
const MAYA_DEFAULT_DETAIL = 'Approval still happens in the Maya app';

const INITIAL_WALLETS: LinkedWallet[] = [
  { id: 'gcash', name: 'GCash', detail: GCASH_DEFAULT_DETAIL, linked: false, color: '#0070E0' },
  { id: 'maya', name: 'Maya', detail: MAYA_DEFAULT_DETAIL, linked: false, color: '#18C16E' },
];

const INITIAL_CARDS: SavedCard[] = [
  { id: '1', label: 'Visa **** 4242', type: 'Visa', last4: '4242' },
];

export const usePaymentMethodsStore = create<PaymentMethodsState>()(
  persist(
    (set) => ({
      wallets: INITIAL_WALLETS,
      cards: INITIAL_CARDS,
      linkWallet: (id, detail) =>
        set((state) => ({
          wallets: state.wallets.map((wallet) =>
            wallet.id === id
              ? {
                  ...wallet,
                  linked: true,
                  detail,
                }
              : wallet,
          ),
        })),
      unlinkWallet: (id) =>
        set((state) => ({
          wallets: state.wallets.map((wallet) =>
            wallet.id === id
              ? {
                  ...wallet,
                  linked: false,
                  detail: wallet.id === 'maya' ? MAYA_DEFAULT_DETAIL : GCASH_DEFAULT_DETAIL,
                }
              : wallet,
          ),
        })),
      addCard: (card) =>
        set((state) => ({
          cards: [...state.cards, card],
        })),
      removeCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== id),
        })),
    }),
    {
      name: '@parking/mobile-payment-methods',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
