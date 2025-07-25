export function About() {
  return (
    <div className="space-y-6 text-gray-800 dark:text-gray-200 p-4 overflow-y-auto max-h-[80vh]">
      <h1 className="text-3xl font-bold">About Clu3</h1>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Understanding Each Other</h2>
        <p className="list-disc pl-5 space-y-1">
          What I love most about Codenames is that it lets you peek into how someone else thinks and how people you thought you know quite well connect seemingly unrelated concepts. Playing with close friends or a partner is always entertaining; you end up laughing at the not so obvious associations their minds concoct. While a human mind is already something of a black box, an AI&rsquo;s “mind” is even more mysterious.<br />
          Clu3 is a tiny experiment of mine to see how well AI understands human reasoning and, perhaps even more interestingly, how well humans can decipher AI reasoning.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Feedback &amp; Thoughts</h2>
        <p className="list-disc pl-5 space-y-1">
          How did you enjoy the game? Did you feel you understood the clues the AI gave you? Do you now have a clearer sense of its reasoning? I&rsquo;d love to hear your thoughts and feedback:&nbsp;
          <a
            href="mailto:clu3@juliakzl.com"
            className="underline"
          >
            clu3@juliakzl.com
          </a>
        </p>
      </section>
    </div>
  );
}