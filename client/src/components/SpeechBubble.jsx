export default function SpeechBubble({ dialogues }) {
  if (!dialogues || dialogues.length === 0) return null;

  return (
    <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-2 pointer-events-none">
      {dialogues.map((d, i) => (
        <div key={i} className="relative self-start max-w-[80%]">
          <div className="bg-white border-2 border-black rounded-xl px-3 py-2 leading-snug shadow-sm">
            {d.character && (
              <span className="block text-[10px] font-black text-orange-600 uppercase tracking-wide mb-0.5">
                {d.character}
              </span>
            )}
            <span className="text-black text-xs font-bold">{d.text}</span>
          </div>
          {/* bubble tail */}
          <div className="absolute -bottom-2 left-5 w-3 h-3 bg-white border-r-2 border-b-2 border-black rotate-45" />
        </div>
      ))}
    </div>
  );
}
