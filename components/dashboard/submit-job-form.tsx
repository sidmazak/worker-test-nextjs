"use client";

import { useActionState } from "react";
import { createJob } from "@/app/actions/jobs";

type SubmitJobFormProps = {
  onSubmitted?: () => void;
};

const initialState = { error: "" };

async function submitAction(_prevState: typeof initialState, formData: FormData) {
  try {
    await createJob(formData);
    return { error: "" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unexpected error" };
  }
}

export function SubmitJobForm({ onSubmitted }: SubmitJobFormProps) {
  const [state, formAction, pending] = useActionState(submitAction, initialState);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onSubmitted?.();
      }}
      className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <h2 className="text-sm font-semibold text-zinc-100">Enqueue Simulation Job</h2>
      <label className="block text-sm text-zinc-300">
        Title
        <input
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="Daily data batch"
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Complexity
        <select
          name="complexity"
          defaultValue="medium"
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Add Job"}
      </button>
    </form>
  );
}
