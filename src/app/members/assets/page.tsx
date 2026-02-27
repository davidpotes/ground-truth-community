/**
 * members/assets/page.tsx — Camp inventory management interface
 * 
 * Comprehensive asset tracking with categories, photos, transportation assignments,
 * and storage location management. Features search, filtering, and bulk import/export.
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const CATEGORIES = [
  "shade", "kitchen", "power", "structure", "hardware",
  "safety", "decor", "tools", "art", "general",
];

const CONDITIONS = ["Good", "Fair", "Needs Repair", "Replace", "New/Unused"];
const LOCATIONS = ["Storage Unit", "Member Home", "On Playa", "In Transit", "Need to Buy", "Unknown"];

interface Asset {
  id: string;
  itemName: string;
  category: string;
  qtyNeeded: number;
  qtyHave: number;
  custodian: string | null;
  condition: string | null;
  storageLocation: string | null;
  willBring: string | null;
  transportVehicle: string | null;
  notes: string | null;
  lastInventoried: string | null;
  photoUrl: string | null;
}

export default function AssetTracker() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inventoryMode, setInventoryMode] = useState(false);
  const [inventoryIdx, setInventoryIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});
  const [tempQty, setTempQty] = useState(0);
  const [tempCond, setTempCond] = useState("Good");
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [addForm, setAddForm] = useState({
    itemName: "", category: "general", qtyNeeded: 0, qtyHave: 0,
    custodian: "", condition: "", storageLocation: "", notes: "",
  });

  const isAdmin = (session?.user as any)?.isAdmin;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/members/signin");
  }, [status, router]);

  const load = () => {
    fetch("/api/members/assets").then((r) => r.json()).then((d) => setAssets(d.assets || []));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/members/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAddForm({ itemName: "", category: "general", qtyNeeded: 0, qtyHave: 0, custodian: "", condition: "", storageLocation: "", notes: "" });
    setShowAdd(false);
    load();
  };

  const updateAsset = async (id: string, data: Partial<Asset>) => {
    await fetch("/api/members/assets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    load();
  };

  const deleteAsset = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/members/assets?id=${id}`, { method: "DELETE" });
    load();
  };

  const uploadPhoto = async (assetId: string, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("assetId", assetId);
      const res = await fetch("/api/members/assets/photo", { method: "POST", body: formData });
      if (res.ok) load();
    } finally { setUploading(false); }
  };

  const deletePhoto = async (assetId: string) => {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/members/assets/photo?assetId=${assetId}`, { method: "DELETE" });
    load();
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setShowCamera(false);
    }
  };

  const capturePhoto = async (assetId: string) => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
      await uploadPhoto(assetId, file);
      stopCamera();
    }, "image/jpeg", 0.85);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const confirmInventory = async (asset: Asset, have: number, condition: string) => {
    await updateAsset(asset.id, {
      qtyHave: have,
      condition,
      lastInventoried: new Date().toISOString(),
    } as any);
  };

  // Filter/search
  const categories = [...new Set(assets.map((a) => a.category))].sort();
  const filtered = assets.filter((a) => {
    if (filter !== "all" && a.category !== filter) return false;
    if (search && !a.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalItems = assets.length;
  const totalNeeded = assets.reduce((s, a) => s + a.qtyNeeded, 0);
  const totalHave = assets.reduce((s, a) => s + a.qtyHave, 0);
  const needToBuy = assets.filter((a) => a.qtyHave < a.qtyNeeded).length;
  const inventoried = assets.filter((a) => a.lastInventoried).length;

  if (status === "loading") return null;

  // =========== INVENTORY MODE ===========
  // Sync temp values when inventory index changes (use asset ID to avoid re-triggering on every render)
  const currentInventoryAssetId = (inventoryMode && filtered.length > 0)
    ? (filtered[inventoryIdx] || filtered[0])?.id
    : null;
  useEffect(() => {
    if (currentInventoryAssetId && inventoryMode && filtered.length > 0) {
      const asset = filtered[inventoryIdx] || filtered[0];
      setTempQty(asset.qtyHave);
      setTempCond(asset.condition || "Good");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentInventoryAssetId, inventoryMode]);

  if (inventoryMode && filtered.length > 0) {
    const asset = filtered[inventoryIdx] || filtered[0];

    return (
      <div className="max-w-lg mx-auto px-4 pt-24 pb-20">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { stopCamera(); setInventoryMode(false); }} className="text-slate-500 hover:text-slate-300">
            ✕ Exit Inventory
          </button>
          <span className="text-slate-400 text-sm">
            {inventoryIdx + 1} / {filtered.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-[#0a0b1e] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${((inventoryIdx + 1) / filtered.length) * 100}%` }}
          />
        </div>

        <div className="bg-[#161849]/80 rounded-2xl p-6 border border-white/5 card-glow">
          <p className="text-indigo-400 text-xs uppercase tracking-wider mb-1">{asset.category}</p>
          <h2 className="text-2xl font-bold mb-4">{asset.itemName}</h2>

          {/* Photo display + camera */}
          <div className="mb-4">
            {showCamera ? (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <button onClick={() => capturePhoto(asset.id)}
                    className="w-16 h-16 rounded-full bg-white border-4 border-white/30 active:scale-90 transition-transform" />
                  <button onClick={stopCamera}
                    className="absolute right-3 top-auto bg-red-600/80 px-3 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            ) : asset.photoUrl ? (
              <div className="relative">
                <img src={asset.photoUrl} alt={asset.itemName} className="w-full rounded-xl object-cover max-h-48" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button onClick={() => startCamera()}
                    className="bg-black/60 px-3 py-1.5 rounded-lg text-xs hover:bg-black/80">📷 Retake</button>
                  <button onClick={() => deletePhoto(asset.id)}
                    className="bg-red-600/60 px-3 py-1.5 rounded-lg text-xs hover:bg-red-600/80">🗑 Delete</button>
                </div>
              </div>
            ) : (
              <button onClick={() => startCamera()}
                className="w-full py-6 rounded-xl border-2 border-dashed border-white/10 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors">
                📸 Take Photo
              </button>
            )}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(asset.id, f); }} />
          </div>

          {asset.notes && (
            <p className="text-slate-400 text-sm mb-4 bg-[#0a0b1e]/50 rounded-lg p-3">{asset.notes}</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-slate-500 text-xs mb-1">Need</p>
              <p className="text-2xl font-bold">{asset.qtyNeeded}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Have (update below)</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTempQty(Math.max(0, tempQty - 1))}
                  className="w-10 h-10 rounded-lg bg-[#0a0b1e] border border-white/10 text-xl font-bold hover:bg-white/5 active:scale-95"
                >
                  −
                </button>
                <span className="text-2xl font-bold w-8 text-center">{tempQty}</span>
                <button
                  onClick={() => setTempQty(tempQty + 1)}
                  className="w-10 h-10 rounded-lg bg-[#0a0b1e] border border-white/10 text-xl font-bold hover:bg-white/5 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-slate-500 text-xs mb-2">Condition</p>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTempCond(c)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                    tempCond === c
                      ? "bg-indigo-600 text-white"
                      : "bg-[#0a0b1e] border border-white/10 text-slate-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                await confirmInventory(asset, tempQty, tempCond);
                if (inventoryIdx < filtered.length - 1) {
                  setInventoryIdx(inventoryIdx + 1);
                } else {
                  setInventoryMode(false);
                }
              }}
              className="flex-1 bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-lg transition-all active:scale-95"
            >
              {inventoryIdx < filtered.length - 1 ? "Confirm → Next" : "Confirm → Done"}
            </button>
            <button
              onClick={() => {
                if (inventoryIdx < filtered.length - 1) setInventoryIdx(inventoryIdx + 1);
                else setInventoryMode(false);
              }}
              className="px-4 py-4 rounded-xl bg-[#0a0b1e] border border-white/10 text-slate-400 hover:bg-white/5 active:scale-95"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setInventoryIdx(Math.max(0, inventoryIdx - 1))}
            disabled={inventoryIdx === 0}
            className="text-sm text-slate-500 hover:text-slate-300 disabled:opacity-30"
          >
            ← Previous
          </button>
          <button
            onClick={() => setInventoryIdx(Math.min(filtered.length - 1, inventoryIdx + 1))}
            disabled={inventoryIdx >= filtered.length - 1}
            className="text-sm text-slate-500 hover:text-slate-300 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // =========== MAIN VIEW ===========
  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/members" className="text-slate-500 hover:text-slate-300">← Back</Link>
          <h1 className="text-2xl font-bold">Asset Tracker</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setInventoryIdx(0); setInventoryMode(true); }}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            📋 Inventory Mode
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Item
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Items", value: totalItems, color: "text-slate-300" },
          { label: "Qty Needed", value: totalNeeded, color: "text-indigo-400" },
          { label: "Qty Have", value: totalHave, color: "text-green-400" },
          { label: "Need to Buy", value: needToBuy, color: needToBuy > 0 ? "text-yellow-400" : "text-green-400" },
          { label: "Inventoried", value: `${inventoried}/${totalItems}`, color: "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#161849]/60 rounded-xl p-3 border border-white/5">
            <p className="text-slate-500 text-[10px] uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="flex-1 min-w-[200px] bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-[#161849]/60 rounded-xl p-5 border border-white/5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm text-slate-400 mb-1">Item Name *</label>
            <input type="text" required value={addForm.itemName}
              onChange={(e) => setAddForm({ ...addForm, itemName: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Category</label>
            <select value={addForm.category}
              onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Qty Needed</label>
            <input type="number" min={0} value={addForm.qtyNeeded}
              onChange={(e) => setAddForm({ ...addForm, qtyNeeded: Number(e.target.value) })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Qty Have</label>
            <input type="number" min={0} value={addForm.qtyHave}
              onChange={(e) => setAddForm({ ...addForm, qtyHave: Number(e.target.value) })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Custodian</label>
            <input type="text" value={addForm.custodian}
              onChange={(e) => setAddForm({ ...addForm, custodian: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Storage Location</label>
            <select value={addForm.storageLocation}
              onChange={(e) => setAddForm({ ...addForm, storageLocation: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none">
              <option value="">Unknown</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="block text-sm text-slate-400 mb-1">Notes</label>
            <input type="text" value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              className="w-full bg-[#0a0b1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="col-span-2 md:col-span-3">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-medium transition-colors">
              Add Item
            </button>
          </div>
        </form>
      )}

      {/* Asset list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-[#161849]/60 rounded-xl p-8 border border-white/5 text-center">
            <p className="text-slate-500">No items found.</p>
          </div>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="bg-[#161849]/60 rounded-xl p-4 border border-white/5">
              {editingId === a.id ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Item Name</label>
                    <input type="text" value={editForm.itemName || ""} onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })}
                      className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Category</label>
                    <select value={editForm.category || "general"} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Need</label>
                    <input type="number" value={editForm.qtyNeeded || 0} onChange={(e) => setEditForm({ ...editForm, qtyNeeded: Number(e.target.value) })}
                      className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Have</label>
                    <input type="number" value={editForm.qtyHave || 0} onChange={(e) => setEditForm({ ...editForm, qtyHave: Number(e.target.value) })}
                      className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Custodian</label>
                    <input type="text" value={editForm.custodian || ""} onChange={(e) => setEditForm({ ...editForm, custodian: e.target.value })}
                      className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Condition</label>
                    <select value={editForm.condition || ""} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                      className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm">
                      <option value="">—</option>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Location</label>
                    <select value={editForm.storageLocation || ""} onChange={(e) => setEditForm({ ...editForm, storageLocation: e.target.value })}
                      className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm">
                      <option value="">—</option>
                      {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Notes</label>
                    <textarea value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-white text-sm min-h-[60px]" />
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Photo</label>
                    <div className="flex items-center gap-3">
                      {a.photoUrl && (
                        <img src={a.photoUrl} alt="" className="w-16 h-16 rounded object-cover" />
                      )}
                      <label className="cursor-pointer text-sm bg-[#0a0b1e] border border-white/10 rounded px-3 py-1.5 text-slate-400 hover:text-white">
                        {uploading ? "Uploading..." : (a.photoUrl ? "Replace" : "Upload Photo")}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(a.id, f); }} />
                      </label>
                      {a.photoUrl && (
                        <button onClick={() => deletePhoto(a.id)}
                          className="text-xs text-red-400/50 hover:text-red-400">Remove</button>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-4 flex gap-2">
                    <button onClick={async () => { await updateAsset(a.id, editForm); setEditingId(null); }}
                      className="text-sm bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded">Save</button>
                    <button onClick={() => setEditingId(null)}
                      className="text-sm text-slate-500 hover:text-slate-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  {a.photoUrl && (
                    <img src={a.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover mr-3 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-white/5 rounded px-2 py-0.5 text-slate-500">{a.category}</span>
                      <span className="font-medium">{a.itemName}</span>
                      {a.qtyHave < a.qtyNeeded && a.qtyNeeded > 0 && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">NEED {a.qtyNeeded - a.qtyHave} MORE</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      <span>Need: <strong className="text-slate-300">{a.qtyNeeded}</strong></span>
                      <span>Have: <strong className={a.qtyHave >= a.qtyNeeded ? "text-green-400" : "text-yellow-400"}>{a.qtyHave}</strong></span>
                      {a.custodian && <span>Custodian: <strong className="text-slate-300">{a.custodian}</strong></span>}
                      {a.condition && <span>Condition: <strong className="text-slate-300">{a.condition}</strong></span>}
                      {a.storageLocation && <span>Location: <strong className="text-slate-300">{a.storageLocation}</strong></span>}
                      {a.lastInventoried && <span className="text-green-600">✓ Checked {new Date(a.lastInventoried).toLocaleDateString()}</span>}
                    </div>
                    {a.notes && (
                      <p className="text-xs text-slate-600 mt-1 truncate max-w-md cursor-help" title={a.notes}>{a.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => { setEditingId(a.id); setEditForm(a); }}
                      className="text-xs text-slate-500 hover:text-slate-300">Edit</button>
                    {isAdmin && (
                      <button onClick={() => deleteAsset(a.id)}
                        className="text-xs text-red-400/50 hover:text-red-400">🗑</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
