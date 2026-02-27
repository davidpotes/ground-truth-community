/**
 * apply/page.tsx — Public recruitment application form
 * 
 * Multi-section form for potential members to apply to join the camp.
 * Includes culture fit questions, camp scenarios, and logistics planning.
 * Submits to rate-limited /api/apply endpoint.
 */

"use client";

import { useState } from "react";

const COMFORT_LABELS = ["1 — please no", "2", "3", "4", "5 — my calling"];

export default function Apply() {
  const [form, setForm] = useState({
    namePronouns: "",
    email: "",
    socialHandle: "",
    projectDescription: "",
    enthusiasm: "",
    campScenario: "",
    gentleReminder: "",
    approachStrangers: 3,
    theatrical: 3,
    straightFace: 3,
    beingApproached: 3,
    idealBalance: "",
    burnExperience: "",
    campingSetup: "",
    skillsResources: "",
    duesQuestions: "",
    anythingElse: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string | number) => setForm({ ...form, [key]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const refMatch = document.cookie.match(/camp_ref=([^;]+)/);
    const caseRef = refMatch ? decodeURIComponent(refMatch[1]) : null;

    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, caseRef }),
    });

    if (res.ok) {
      setSubmitted(true);
    } else {
      setError("Something went wrong. Try again.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-32 pb-20 text-center">
        <div className="bg-[#161849]/80 rounded-xl p-10 border border-white/5 card-glow">
          <p className="text-4xl mb-4">✨</p>
          <h1 className="text-2xl font-bold mb-3">Application Received</h1>
          <p className="text-slate-400">
            Thanks for applying! Our team will review your application
            and reach out if you&apos;re selected to join camp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
      <div className="bg-[#161849]/80 rounded-xl p-8 border border-white/5 card-glow">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">
            Camp Application
          </p>
          <h1 className="text-2xl font-bold">
            Join Our Camp
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Welcome, prospective campmate. Please fill out the following so we can get to know you.
            There are no wrong answers, but there are boring ones.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <Field
            label="What should we call you, and what are your pronouns?"
            required
          >
            <input
              type="text"
              value={form.namePronouns}
              onChange={(e) => set("namePronouns", e.target.value)}
              className="form-input"
              placeholder="Name / pronouns"
              required
            />
          </Field>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email (optional)">
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                className="form-input" placeholder="you@example.com" />
            </Field>
            <Field label="Social handle (optional)">
              <input type="text" value={form.socialHandle} onChange={(e) => set("socialHandle", e.target.value)}
                className="form-input" placeholder="@handle (IG, etc)" />
            </Field>
          </div>

          {/* Project */}
          <Field label="Describe a project, creation, or scheme you've executed that most people in your life didn't fully understand.">
            <textarea value={form.projectDescription} onChange={(e) => set("projectDescription", e.target.value)}
              className="form-input min-h-[100px]" />
          </Field>

          {/* Enthusiasm */}
          <Field label="What's something you're genuinely, unironically enthusiastic about that you sometimes have to stop yourself from talking about too much?">
            <textarea value={form.enthusiasm} onChange={(e) => set("enthusiasm", e.target.value)}
              className="form-input min-h-[80px]" />
          </Field>

          {/* Camp scenario */}
          <Field label="You're at camp. It's 2pm. It's hot. The shade structure needs adjusting, the dishes are piling up, and someone left the cooler open again. Meanwhile, there's a really good sound camp starting up nearby. What do you actually do?">
            <textarea value={form.campScenario} onChange={(e) => set("campScenario", e.target.value)}
              className="form-input min-h-[80px]" />
          </Field>

          {/* Gentle reminder */}
          <Field label="Be honest: In group living situations, what's the thing you're most likely to need a gentle reminder about?">
            <textarea value={form.gentleReminder} onChange={(e) => set("gentleReminder", e.target.value)}
              className="form-input min-h-[80px]" />
          </Field>

          {/* Comfort ratings */}
          <div className="bg-[#0a0b1e]/50 rounded-lg p-5">
            <p className="text-sm text-slate-300 mb-1 font-medium">
              Our camp is interactive — we engage with passersby and the community.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Rate your comfort level (1 = please no, 5 = my calling):
            </p>

            <div className="space-y-4">
              {[
                { key: "approachStrangers", label: "Approaching strangers in a friendly way" },
                { key: "theatrical", label: "Light theatrical/character performance" },
                { key: "straightFace", label: "Explaining weird concepts with a straight face" },
                { key: "beingApproached", label: "Being approached by curious/confused strangers" },
              ].map((item) => (
                <div key={item.key}>
                  <p className="text-sm text-slate-400 mb-2">{item.label}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set(item.key, n)}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                          (form as any)[item.key] === n
                            ? "bg-indigo-600 text-white"
                            : "bg-[#161849] border border-white/10 text-slate-500 hover:border-indigo-500/30"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Balance */}
          <Field label="What's your ideal balance of 'being ON for the public' vs. 'chilling at camp' vs. 'exploring the playa'?">
            <textarea value={form.idealBalance} onChange={(e) => set("idealBalance", e.target.value)}
              className="form-input min-h-[60px]" />
          </Field>

          {/* Burn experience */}
          <Field label="Have you been to Burning Man before? If yes, how many times? If no, other burn/festival experience?">
            <textarea value={form.burnExperience} onChange={(e) => set("burnExperience", e.target.value)}
              className="form-input min-h-[60px]" />
          </Field>

          {/* Camping setup */}
          <Field label="What's your camping setup? (Tent, van, RV, etc. — and do you have everything you need, or are you still figuring it out?)">
            <textarea value={form.campingSetup} onChange={(e) => set("campingSetup", e.target.value)}
              className="form-input min-h-[60px]" />
          </Field>

          {/* Skills */}
          <Field label="What skills, resources, or gear can you contribute to camp?">
            <textarea value={form.skillsResources} onChange={(e) => set("skillsResources", e.target.value)}
              className="form-input min-h-[60px]" />
          </Field>

          {/* Dues */}
          <Field label="Camp dues are sliding scale based on what you can afford. Any questions or concerns about this?">
            <textarea value={form.duesQuestions} onChange={(e) => set("duesQuestions", e.target.value)}
              className="form-input min-h-[60px]" />
          </Field>

          {/* Anything else */}
          <Field label="Anything else you want us to know — or a question you wish we'd asked?">
            <textarea value={form.anythingElse} onChange={(e) => set("anythingElse", e.target.value)}
              className="form-input min-h-[60px]" />
          </Field>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
