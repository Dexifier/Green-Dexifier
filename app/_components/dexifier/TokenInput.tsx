import { Input } from "@/components/ui/input";
import { Dispatch, InputHTMLAttributes, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import TokenModal from "./TokenModal";
import { Button } from "@/components/ui/button";
import TokenIcon from "../common/token-icon";
import { useDexifier } from "@/app/providers/DexifierProvider";
import { Blockchain, Token } from "@/app/types/dexifier";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Defining the interface for TokenInput props
interface TokenInputProps extends InputHTMLAttributes<HTMLInputElement> {
  token: Token | undefined; // Token selected by the user
  setToken: Dispatch<SetStateAction<Token | undefined>>; // Setter function for updating the token state
  onClear?: () => void; // When provided (editable fields), shows an ✕ button to clear the value
}

const TokenInput: React.FC<TokenInputProps> = ({ token, setToken, onClear, ...props }) => {
  const { isMobile, chains } = useDexifier();
  // Find the selected blockchain's metadata
  const selectedBlochchain = useMemo<Blockchain | undefined>(() => {
    if (token) return chains.find((blockchain: Blockchain) => blockchain.name === token.blockchain)
  }, [chains, token]);

  // Quote fields (disabled/readonly) flash softly whenever the value updates
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(props.value);
  useEffect(() => {
    if (!props.disabled) return;
    if (prevValue.current === props.value) return;
    prevValue.current = props.value;
    if (!props.value) return;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 450);
    return () => clearTimeout(timer);
  }, [props.value, props.disabled]);

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/40 p-3 transition duration-300 hover:border-white/20 focus-within:border-primary/60 focus-within:shadow-neon-sm">
      {/* Input field for token amount */}
      <div className={cn("flex flex-col flex-1 min-w-0", flash && "animate-quote-flash")}>
        <div className="relative">
          <Input {...props} /> {/* Custom input for entering token amount */}
          {onClear && !!props.value && (
            <button
              type="button"
              aria-label="Clear amount"
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <span className="text-xs px-1 text-white/40 tnum">
          {/* Display estimated USD value of the token */}
          ~
          {token?.usdPrice && props.value ? (Number(props.value) * token.usdPrice).toFixed(2) : 0}
          $
        </span>
      </div>
      {/* Token selection button */}
      <TokenModal selectedToken={token} setToken={setToken}>
        <Button className="h-auto shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-center gap-2 transition duration-300 hover:bg-white/10 hover:border-primary/50">
          {/* Display selected token info or default "Select Token" */}
          {token ?
            <>
              <TokenIcon
                token={{
                  image: token.image!,
                  alt: token.symbol!,
                  className: isMobile ? "size-7" : "size-8",
                }}
                blockchain={{
                  image: selectedBlochchain?.logo || '',
                  alt: selectedBlochchain?.name,
                  className: "size-4",
                }}
              />
              <div className="flex flex-col overflow-hidden text-left">
                <span className="font-semibold leading-tight">{token.symbol}</span>
                <span className="text-xs text-white/50 leading-tight">
                  {/* Display blockchain name */}
                  {token.blockchain}
                </span>
              </div>
              <ChevronDown size={14} className="text-white/50" />
            </>
            :
            <>
              <span className="text-sm font-medium">Select Token</span>
              <ChevronDown size={14} className="text-white/50" />
            </>
          }
        </Button>
      </TokenModal>
    </div>
  );
};

export default TokenInput;
