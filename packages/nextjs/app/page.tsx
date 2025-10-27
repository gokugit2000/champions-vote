import { FHEChampionsVote } from "./_components/FHEVoteChampions";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 items-center sm:items-start w-full px-3 md:px-0">
      <FHEChampionsVote />
    </div>
  );
}
