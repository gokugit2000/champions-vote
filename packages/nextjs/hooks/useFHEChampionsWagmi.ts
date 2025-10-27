"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import {
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import { useReadContract } from "wagmi";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";

export const useFHEChampionsVoteWagmi = (parameters: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = parameters;
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: fheChampionsVote } = useDeployedContractInfo({
    contractName: "FHEChampionsVote",
    chainId: allowedChainId,
  });

  type FHEChampionsVoteInfo = Contract<"FHEChampionsVote"> & { chainId?: number };

  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const hasContract = Boolean(fheChampionsVote?.address && fheChampionsVote?.abi);
  const hasSigner = Boolean(ethersSigner);
  const hasProvider = Boolean(ethersReadonlyProvider);

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(fheChampionsVote!.address, (fheChampionsVote as FHEChampionsVoteInfo).abi, providerOrSigner);
  };

  // Read encrypted vote
  const {
    data: myVoteHandle,
    refetch: refreshMyVoteHandle,
    isFetching: isRefreshing,
  } = useReadContract({
    address: hasContract ? (fheChampionsVote!.address as `0x${string}`) : undefined,
    abi: hasContract ? ((fheChampionsVote as FHEChampionsVoteInfo).abi as any) : undefined,
    functionName: "encryptedVoteOf" as const,
    args: [accounts ? accounts[0] : ""],
    query: {
      enabled: Boolean(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });

  const voteHandle = useMemo(() => (myVoteHandle as string | undefined) ?? undefined, [myVoteHandle]);

  const hasVoted = useMemo(() => {
    if (!voteHandle) return false;
    if (voteHandle === ethers.ZeroHash || voteHandle === "0x" || voteHandle === "0x0") return false;
    return true;
  }, [voteHandle]);

  const requests = useMemo(() => {
    if (!hasContract || !voteHandle || voteHandle === ethers.ZeroHash) return undefined;
    return [{ handle: voteHandle, contractAddress: fheChampionsVote!.address }] as const;
  }, [hasContract, fheChampionsVote?.address, voteHandle]);

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decMsg,
    results,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests,
  });

  useEffect(() => {
    if (decMsg) setMessage(decMsg);
  }, [decMsg]);

  const clearVote = useMemo(() => {
    if (!voteHandle) return undefined;
    if (voteHandle === ethers.ZeroHash) return { handle: voteHandle, clear: BigInt(0) } as const;
    const clear = results[voteHandle];
    if (typeof clear === "undefined") return undefined;
    return { handle: voteHandle, clear } as const;
  }, [voteHandle, results]);

  const isDecrypted = useMemo(() => {
    if (!voteHandle) return false;
    const val = results?.[voteHandle];
    return typeof val !== "undefined" && BigInt(val) !== BigInt(0);
  }, [voteHandle, results]);

  const decryptMyVote = decrypt;

  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: fheChampionsVote?.address,
  });

  const canVote = useMemo(
    () => Boolean(hasContract && instance && hasSigner && !isProcessing),
    [hasContract, instance, hasSigner, isProcessing],
  );

  const getEncryptionMethodFor = (functionName: "submitVote") => {
    const functionAbi = fheChampionsVote?.abi.find(item => item.type === "function" && item.name === functionName);
    if (!functionAbi) {
      return { method: undefined as string | undefined, error: `Function ABI not found for ${functionName}` };
    }
    if (!functionAbi.inputs || functionAbi.inputs.length === 0) {
      return { method: undefined as string | undefined, error: `No inputs found for ${functionName}` };
    }
    const firstInput = functionAbi.inputs[0]!;
    return { method: getEncryptionMethod(firstInput.internalType), error: undefined };
  };

  const submitVote = useCallback(
    async (teamId: number) => {
      if (isProcessing || !canVote || teamId <= 0) return;
      setIsProcessing(true);
      setMessage(`Encrypting and voting for team ${teamId}...`);
      try {
        const { method, error } = getEncryptionMethodFor("submitVote");
        if (!method) return setMessage(error ?? "Encryption method not found");
        const enc = await encryptWith(builder => {
          (builder as any)[method](teamId);
        });
        if (!enc) return setMessage("Encryption failed");
        const writeContract = getContract("write");
        if (!writeContract) return setMessage("Signer not available");
        const params = buildParamsFromAbi(enc, [...fheChampionsVote!.abi] as any[], "submitVote");
        const tx = await writeContract.submitVote(...params, { gasLimit: 300_000 });
        setMessage("Waiting for confirmation...");
        await tx.wait();
        setMessage(`Vote updated to team ${teamId}!`);
        await refreshMyVoteHandle();
      } catch (e) {
        setMessage(`submitVote() failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, canVote, encryptWith, getContract, refreshMyVoteHandle, fheChampionsVote?.abi],
  );

  useEffect(() => {
    setMessage("");
  }, [accounts, chainId]);

  return {
    contractAddress: fheChampionsVote?.address,
    canDecrypt,
    canVote,
    decryptMyVote,
    submitVote,
    refreshMyVoteHandle,
    isDecrypted,
    message,
    clear: clearVote?.clear,
    handle: voteHandle,
    isDecrypting,
    isRefreshing,
    isProcessing,
    hasVoted,
    chainId,
    accounts,
    isConnected,
    ethersSigner,
  };
};
