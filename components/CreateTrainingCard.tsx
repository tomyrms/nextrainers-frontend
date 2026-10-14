import { CirclePlus, ArrowRight } from "lucide-react";

/**
 * Hero CTA of the home screen: opens the training builder
 * (signed-out for now, so it is a static affordance).
 */
export function CreateTrainingCard() {
  return (
    <button
      type="button"
      className="glow-primary flex w-full cursor-pointer flex-col justify-between gap-10 rounded-card border border-white/20 p-6 text-left text-primary-foreground active:scale-[0.98]"
    >
      <span className="flex w-full justify-end">
        <CirclePlus className="size-6" strokeWidth={1.25} />
      </span>
      <span className="flex w-full items-center text-lg font-semibold">
        Créer un nouvel entraînement
        <ArrowRight className="ml-2 size-5" strokeWidth={2} />
      </span>
    </button>
  );
}
