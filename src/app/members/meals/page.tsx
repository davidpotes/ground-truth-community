"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Meal {
  id: string;
  mealName: string;
  portions: number;
  dietaryTags: string | null;
  status: string;
  member: { user: { name: string } };
}

export default function MealBoard() {
  const { status } = useSession();
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [mealName, setMealName] = useState("");
  const [portions, setPortions] = useState(4);
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
  }, [status, router]);

  const loadMeals = () => {
    fetch("/api/members/meals").then((r) => r.json()).then((d) => setMeals(d.meals || []));
  };

  useEffect(() => { loadMeals(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/members/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealName, portions, dietaryTags: tags || null }),
    });
    setMealName("");
    setPortions(4);
    setTags("");
    setShowForm(false);
    loadMeals();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/members/meals?id=${id}`, { method: "DELETE" });
    loadMeals();
  };

  const totalPortions = meals.reduce((sum, m) => sum + m.portions, 0);
  // Target: ~2 meals/person/day × 20 people × 7 days
  const target = 280;
  const pct = Math.min(100, Math.round((totalPortions / target) * 100));

  if (status === "loading") return null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
        <h1 className="text-2xl font-bold">Meal Board</h1>
      </div>

      <p className="text-slate-400 mb-6">
        Sign up to bring vacuum-packed frozen meals. Each portion feeds one person one meal.
        Bring them frozen — we store in the communal deep freeze and anyone can boil water for a tasty meal.
      </p>

      {/* Progress */}
      <div className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Portions pledged</span>
          <span className="text-indigo-400 font-bold">{totalPortions} / {target}</span>
        </div>
        <div className="h-3 bg-[#0a0b1e] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct > 75 ? '#4ade80' : pct > 40 ? '#facc15' : '#f87171' }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Target: ~2 meals × 20 people × 7 days = {target} portions
        </p>
      </div>

      {/* Add meal button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-6 bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-lg font-medium transition-colors"
      >
        + Pledge a Meal
      </button>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Meal Name</label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Thai Green Curry"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Portions</label>
              <input
                type="number"
                value={portions}
                onChange={(e) => setPortions(Number(e.target.value))}
                min={1}
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Dietary Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                placeholder="vegan, GF, etc"
              />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-medium transition-colors">
            Submit
          </button>
        </form>
      )}

      {/* Meal list */}
      <div className="space-y-3">
        {meals.length === 0 ? (
          <div className="bg-[#161849]/60 rounded-xl p-6 border border-white/5 text-center">
            <p className="text-slate-500">No meals pledged yet. Be the first!</p>
          </div>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="bg-[#161849]/60 rounded-xl p-4 border border-white/5 flex justify-between items-center">
              <div>
                <p className="font-medium">{meal.mealName}</p>
                <p className="text-sm text-slate-400">
                  {meal.portions} portions · by {meal.member?.user?.name || "Unknown"}
                  {meal.dietaryTags && <span className="ml-2 text-indigo-400">[{meal.dietaryTags}]</span>}
                </p>
              </div>
              <button
                onClick={() => handleDelete(meal.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
