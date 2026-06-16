import FormattedMessage from "./FormattedMessage";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  if (role === "assistant") {
    return (
      <div className="flex flex-col gap-1 max-w-[72%]">
        <span className="text-[11px] tracking-widest uppercase text-warm-light px-1">
          Rosie
        </span>
        <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-5 py-4 text-[15px] text-warm-dark shadow-sm">
          <FormattedMessage content={content} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 max-w-[72%] self-end">
      <div className="bg-blush-light border border-blush/20 rounded-2xl rounded-tr-sm px-5 py-4 text-[15px] text-warm-dark leading-relaxed whitespace-pre-line">
        {content}
      </div>
    </div>
  );
}
