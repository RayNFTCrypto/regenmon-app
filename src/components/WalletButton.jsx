import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openChainModal, openAccountModal, mounted }) => {
        if (!mounted) return null;

        if (!account) {
          return (
            <button className="btn-wallet" onClick={openConnectModal}>
              Conectar Wallet
            </button>
          );
        }

        if (chain?.unsupported) {
          return (
            <button className="btn-wallet wrong-chain" onClick={openChainModal}>
              Red incorrecta
            </button>
          );
        }

        return (
          <button className="btn-wallet connected" onClick={openAccountModal}>
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
