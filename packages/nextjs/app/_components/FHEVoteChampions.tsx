"use client";

import { useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHEChampionsVoteWagmi } from "~~/hooks/useFHEChampionsWagmi";
import ClockLoader from "react-spinners/ClockLoader";

const CLUBS = [
  { id: 1, name: "Real Madrid", image: "/realmadrid.png" },
  { id: 2, name: "Manchester City", image: "/mancity.png" },
  { id: 3, name: "Bayern Munich", image: "/bayern.png" },
  { id: 4, name: "Liverpool", image: "/liverpool.png" },
  { id: 5, name: "Paris Saint-Germain", image: "/psg.png" },
  { id: 6, name: "Barcelona", image: "/barca.png" },
];

export const FHEChampionsVote = () => {
  const { isConnected, chain } = useAccount();
  const chainId = chain?.id;

  const provider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);
  const initialMockChains = {
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  };

  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const championsVote = useFHEChampionsVoteWagmi({ instance: fhevmInstance, initialMockChains });
  const [selectedClub, setSelectedClub] = useState<number | null>(null);

  async function handleVote(id: number) {
    setSelectedClub(id);
    await championsVote.submitVote(id);
  }

  const decryptedClubId = championsVote.isDecrypted ? Number(championsVote.clear) : null;

  function getClubName(id: number) {
    return CLUBS.find(c => c.id === id)?.name ?? "Unknown Club";
  }

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto p-8 text-gray-900 text-center flex items-center"
        style={{ height: "calc(100vh - 60px)" }}
      >
        <div className="bg-white border shadow-xl rounded-xl p-10">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-3">Wallet not connected</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to vote for your favorite club.</p>
          <RainbowKitCustomConnectButton />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="w-[calc(100vw-50px)] relative min-h-screen text-gray-900 overflow-hidden"
    >
      {/* 🌈 Chill dynamic gradient background */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundImage:
            "linear-gradient(-45deg, #001844, #002b80, #1a3cb8, #0099ff)",
          backgroundSize: "400% 400%",
        }}
      />

      {championsVote.isProcessing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <ClockLoader color="#ffffff" size={45} />
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6 space-y-8 relative z-10">
        {/* 🏀 Bounce title */}
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.2 }}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold mb-2 text-white drop-shadow-lg">
            🏆 FHE Champions League Voting
          </h1>
          <p className="text-blue-100">Vote privately for your favorite European football club!</p>
        </motion.div>

        {/* ⚽ Voting Grid with stagger */}
        <motion.div
          className="bg-white/10 border border-[#3c5aa6]/60 shadow-xl p-6 rounded-2xl backdrop-blur-sm"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.12,
              },
            },
          }}
        >
          <h3 className="text-xl font-bold text-white mb-6 border-b pb-2 text-center">
            ⚽ Choose Your Club
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {CLUBS.map(club => {
              const isSelected = selectedClub === club.id;
              const isDecryptedVoted = decryptedClubId === club.id;

              const bgClass = isDecryptedVoted
                ? "bg-[#002266] text-white"
                : isSelected
                ? "bg-[#cdd9ff] text-[#002266]"
                : "bg-white text-[#002266]";

              return (
                <motion.div
                  key={club.id}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    show: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative flex flex-col items-center justify-center p-5 rounded-2xl shadow-md border 
                              cursor-pointer transition-all duration-200 
                              ${bgClass} hover:shadow-xl hover:border-[#0044ff]`}
                  onClick={() => handleVote(club.id)}
                >
                  <motion.img
                    src={club.image}
                    alt={club.name}
                    className="w-24 h-24 object-contain rounded-full border-4 border-white mb-3"
                    animate={{
                      scale: isDecryptedVoted ? [1, 1.1, 1] : 1,
                      boxShadow: isDecryptedVoted
                        ? [
                            "0 0 0px rgba(255,255,255,0)",
                            "0 0 25px rgba(0,68,255,0.9)",
                            "0 0 0px rgba(255,255,255,0)",
                          ]
                        : "none",
                    }}
                    transition={{
                      repeat: isDecryptedVoted ? Infinity : 0,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="text-lg font-semibold text-center">{club.name}</span>

                  {isDecryptedVoted && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute top-2 right-2 text-sm bg-[#00c853] text-white px-3 py-1 rounded-full shadow-md"
                    >
                      ✅ Your Vote
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {championsVote.hasVoted && (
            <p className="text-center text-lg font-medium text-green-400 mt-5">
              ✅ You’ve already voted — but you can change your choice anytime!
            </p>
          )}
        </motion.div>

        {/* 🔐 Encrypted Info */}
        <motion.div
          className="bg-white/10 border border-[#3c5aa6]/60 shadow-xl p-6 rounded-2xl backdrop-blur-sm"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <h3 className="text-xl font-bold text-white mb-4 border-b pb-2">🔐 My Encrypted Vote</h3>
          {printProperty(
            "Vote Handle",
            championsVote.handle !==
              "0x0000000000000000000000000000000000000000000000000000000000000000"
              ? championsVote.handle
              : "No handle yet",
          )}
          {printProperty("Decrypted Value", championsVote.isDecrypted ? String(championsVote.clear) : "Not decrypted yet")}
          {printProperty("Selected Club", championsVote.isDecrypted ? getClubName(Number(championsVote.clear)) : "Not decrypted yet")}

          <button
            disabled={!championsVote.canDecrypt}
            onClick={championsVote.decryptMyVote}
            className={`inline-flex items-center justify-center px-6 py-3 rounded-lg mt-4 font-semibold shadow-md
                        ${championsVote.isDecrypted
                          ? "bg-[#002266] text-white hover:bg-[#001a52]"
                          : "bg-black text-white hover:bg-gray-800"}
                        transition-transform duration-200 hover:scale-105
                        disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {championsVote.canDecrypt
              ? "🔓 Decrypt My Vote"
              : championsVote.isDecrypting
                ? "⏳ Decrypting..."
                : "❌ Nothing to decrypt"}
          </button>
        </motion.div>

        {/* 💬 Message */}
        <AnimatePresence>
          {championsVote.message && (
            <motion.div
              className="bg-white/10 p-6 rounded-2xl shadow-lg backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-xl font-bold text-white mb-4 border-b pb-2">💬 Message</h3>
              <div className="border bg-white/70 border-gray-200 p-4 rounded-md">
                <p className="text-gray-800">{championsVote.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

function printProperty(name: string, value: unknown) {
  let val =
    typeof value === "boolean"
      ? value
        ? "✓ true"
        : "✗ false"
      : typeof value === "string" || typeof value === "number"
        ? String(value)
        : JSON.stringify(value ?? "undefined");

  return (
    <div className="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 rounded-md mb-2">
      <span className="font-medium text-gray-800">{name}</span>
      <span
        className={`font-mono text-sm px-2 py-1 rounded ${
          val.includes("true")
            ? "text-green-800 bg-green-100"
            : val.includes("false")
              ? "text-red-800 bg-red-100"
              : "text-gray-900 bg-gray-100"
        }`}
      >
        {val}
      </span>
    </div>
  );
}
