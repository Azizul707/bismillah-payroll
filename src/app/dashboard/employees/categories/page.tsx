'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Layers, Plus, Tag } from 'lucide-react';
import { db } from '@/app/lib/supabase/client';
import { Category } from '@/app/lib/supabase/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // মেমোইজড ডাটা লোড (সিনক্রোনাস রেন্ডার এরর মুক্ত)
  const loadCategories = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      const { data, error } = await db.categories()
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCategories((data as unknown as Category[]) || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadCategories();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadCategories]);

  // নতুন ক্যাটাগরি তৈরি
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await db.categories().insert({
        category_name: categoryName.trim(),
      });

      if (error) throw error;
      setCategoryName('');
      await loadCategories();
      alert('নতুন ক্যাটাগরি সফলভাবে যুক্ত হয়েছে।');
    } catch (err) {
      console.error(err);
      alert('ক্যাটাগরি যুক্ত করতে ত্রুটি হয়েছে। হয়তো এই নামে ইতিমধ্যে ক্যাটাগরি আছে।');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="border-b pb-4">
        <h1 className="text-2xl md:text-3xl font-black text-[--color-foreground] font-bengali">{"কর্মচারী ক্যাটাগরি সমূহ"}</h1>
        <p className="text-sm font-bold text-[--color-foreground-muted] mt-1 font-bengali">{"কর্মচারীদের পদবী বা বিভাগ পরিবর্তন ও নতুন ক্যাটাগরি তৈরি"}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* বাম কলাম: নতুন ক্যাটাগরি ফর্ম */}
        <div className="card h-fit space-y-4">
          <h2 className="text-lg font-black text-[--color-foreground] font-bengali flex items-center gap-2 border-b border-[--color-border]">
            <Plus className="h-5 w-5 text-[--color-primary]" />
            <span>{"নতুন ক্যাটাগরি যোগ করুন"}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-base font-bold">
            <div className="space-y-1">
              <label className="block font-bengali">{"ক্যাটাগরির নাম (বাংলায়)"}</label>
              <input
                type="text"
                required
                placeholder="যেমন: ড্রাইভার, সিকিউরিটি"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="input-field w-full font-bold text-[--color-foreground] placeholder:text-[--color-foreground-muted] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </form>
        </div>

        {/* ডান কলাম: ক্যাটাগরি তালিকা */}
        <div className="card md:col-span-2 space-y-4">
          <h2 className="text-lg font-black text-[--color-foreground] font-bengali flex items-center gap-2 border-b border-[--color-border]">
            <Layers className="h-5 w-5 text-[--color-primary]" />
            <span>{"বর্তমান ক্যাটাগরি তালিকা"}</span>
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--color-primary] border-t-transparent mx-auto"></div>
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center font-bold text-[--color-foreground-muted] py-8">{"কোনো ক্যাটাগরি পাওয়া যায়নি।"}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div key={cat.id} className="card flex items-center gap-3">
                  <div className="rounded-full bg-[--color-primary]/[0.08] p-2.5 text-[--color-primary]">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-[--color-foreground]">{cat.category_name}</p>
                    <span className="text-[10px] text-[--color-foreground-muted] font-bold">{"আইডি: "}<span className="font-body">{cat.id.slice(0, 8)}...</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}