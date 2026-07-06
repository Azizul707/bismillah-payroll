'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Phone, AlertCircle, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUpMode, setIsSignUpMode] = useState(false); // লগইন নাকি সাইন-আপ টগল স্টেট

  // লগইন ফর্ম স্টেট
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');

  // সাইন-আপ ফর্ম স্টেট
  const [signUpName, setSignUpName] = useState('');
  const [signUpMobile, setSignUpMobile] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // লোকাল স্টোরেজে নতুন ওনার (Md. Arshed) এবং ডিফল্ট ম্যানেজার সিড (Seed) করা
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingUsers = localStorage.getItem('bismillah_users');
      const ownerDetails = {
        mobile: '01682559251',
        name: 'Md. Arshed',
        password: 'allah9251',
        role: 'owner'
      };
      const defaultManager = {
        mobile: '01722222222',
        name: 'ম্যানেজার আব্দুর রহিম',
        password: 'manager123',
        role: 'manager'
      };

      if (!existingUsers) {
        localStorage.setItem('bismillah_users', JSON.stringify([ownerDetails, defaultManager]));
      } else {
        try {
          const list = JSON.parse(existingUsers);
          // যদি নতুন ওনার Md. Arshed ডাটাবেসে না থাকেন, তবে তাকে ইনজেক্ট করা হবে
          const hasOwner = list.some((u: { mobile: string }) => u.mobile === '01682559251');
          if (!hasOwner) {
            list.push(ownerDetails);
            localStorage.setItem('bismillah_users', JSON.stringify(list));
          }
        } catch (e) {
          localStorage.setItem('bismillah_users', JSON.stringify([ownerDetails, defaultManager]));
        }
      }
    }
  }, []);

  // লগইন ফর্ম সাবমিট হ্যান্ডলার
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!mobileNumber || !password) {
      setErrorMsg('অনুগ্রহ করে মোবাইল নম্বর এবং পাসওয়ার্ড দুটোই লিখুন।');
      return;
    }

    try {
      setLoading(true);
      const existingUsersStr = localStorage.getItem('bismillah_users');
      const usersList = existingUsersStr ? JSON.parse(existingUsersStr) : [];

      // ইউজারনেম ও পাসওয়ার্ড ম্যাচিং চেক
      const foundUser = usersList.find(
        (u: { mobile: string; password: string }) => u.mobile === mobileNumber && u.password === password
      );

      if (foundUser) {
        localStorage.setItem('bismillah_current_user', JSON.stringify(foundUser));
        router.push('/dashboard');
      } else {
        setErrorMsg('ভুল মোবাইল নম্বর বা পাসওয়ার্ড। অনুগ্রহ করে আবার চেষ্টা করুন।');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('লগইন করতে অভ্যন্তরীণ সমস্যা হয়েছে।');
      setLoading(false);
    }
  };

  // নতুন ম্যানেজার সাইন-আপ/নিবন্ধন হ্যান্ডলার
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signUpName.trim() || !signUpMobile.trim() || !signUpPassword.trim()) {
      setErrorMsg('অনুগ্রহ করে নিবন্ধনের জন্য সকল তথ্য পূরণ করুন।');
      return;
    }

    try {
      const existingUsersStr = localStorage.getItem('bismillah_users');
      const usersList = existingUsersStr ? JSON.parse(existingUsersStr) : [];

      // মোবাইল নম্বর ডুপ্লিকেট চেক
      const isAlreadyRegistered = usersList.some((u: { mobile: string }) => u.mobile === signUpMobile);
      if (isAlreadyRegistered) {
        setErrorMsg('এই মোবাইল নম্বরটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা হয়েছে।');
        return;
      }

      const newUser = {
        mobile: signUpMobile,
        name: signUpName,
        password: signUpPassword,
        role: 'manager' // সাইন-আপ করা সবাই ম্যানেজার হিসেবে নিবন্ধিত হবেন
      };

      usersList.push(newUser);
      localStorage.setItem('bismillah_users', JSON.stringify(usersList));
      setSuccessMsg('ম্যানেজার হিসেবে আপনার নিবন্ধন সফল হয়েছে! এখন লগইন করুন।');

      // ফর্ম ফিল্ড খালি করা
      setSignUpName('');
      setSignUpMobile('');
      setSignUpPassword('');

      // ২.৫ সেকেন্ড পর স্বয়ংক্রিয়ভাবে লগইন ফর্ম ওপেন হবে
      setTimeout(() => {
        setIsSignUpMode(false);
        setSuccessMsg('');
      }, 2500);

    } catch (err) {
      console.error(err);
      setErrorMsg('নিবন্ধন করতে অভ্যন্তরীণ সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[--color-bg] px-4 py-12 sm:px-6 lg:px-8">
      <div className="card w-full max-w-md space-y-6">

        {/* লোগো ও ব্র্যান্ডিং */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[--color-primary] text-[--color-primary-foreground]">
            <span className="text-2xl font-black">{"বি"}</span>
          </div>
          <h2 className="text-3xl font-black tracking-widest text-[--color-primary] font-bengali">{"বিসমিল্লাহ"}</h2>
          <p className="text-sm font-bold text-[--color-foreground-muted]">{"স্যালারি ও এআই ম্যানেজমেন্ট সিস্টেম"}</p>
        </div>

        {/* এরর বা সাকসেস মেসেজ */}
        {errorMsg && (
          <div className="rounded-lg bg-[--color-danger]/[0.06] p-3 text-sm font-black text-[--color-danger] flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg bg-[--color-success]/[0.06] p-3 text-sm font-black text-[--color-success] flex items-center gap-2 border border-[--color-success]/30">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[--color-success]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* দুই অপশন ট্যাব: লগইন বনাম নতুন ম্যানেজার একাউন্ট */}
        <div className="flex rounded-lg bg-[--color-surface-raised] p-1">
          <button
            onClick={() => { setIsSignUpMode(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-center text-xs sm:text-sm font-black rounded-md transition-colors cursor-pointer ${
              !isSignUpMode ? 'bg-[--color-surface] text-[--color-foreground] shadow-xs border-b border-[--color-border]' : 'text-[--color-foreground-muted] hover:text-[--color-foreground]'
            }`}
          >
            {"লগইন (মালিক ও ম্যানেজার)"}
          </button>
          <button
            onClick={() => { setIsSignUpMode(true); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-center text-xs sm:text-sm font-black rounded-md transition-colors cursor-pointer ${
              isSignUpMode ? 'bg-[--color-primary] text-[--color-primary-foreground] shadow-xs' : 'text-[--color-foreground-muted] hover:text-[--color-foreground]'
            }`}
          >
            {"নতুন ম্যানেজার অ্যাকাউন্ট"}
          </button>
        </div>

        {/* ১. লগইন ফর্ম (মালিক এবং ম্যানেজার উভয়ের জন্য সাধারণ ফর্ম) */}
        {!isSignUpMode ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-base font-bold text-[--color-foreground]">
            <div className="space-y-1">
              <label className="block text-[--color-foreground-muted]">{"মোবাইল নম্বর"}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[--color-foreground-muted]" />
                <input
                  type="text"
                  required
                  placeholder="যেমন: 01712345678"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="input-field w-full pl-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[--color-foreground-muted]">{"পাসওয়ার্ড"}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[--color-foreground-muted]" />
                <input
                  type="password"
                  required
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full pl-11 text-base"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg font-black"
            >
              <LogIn className="h-5 w-5" />
              <span>{loading ? 'প্রবেশ করা হচ্ছে...' : 'লগইন করুন'}</span>
            </button>
          </form>
        ) : (
          // ২. নতুন ম্যানেজার একাউন্ট তৈরির সাইন-আপ ফর্ম
          <form onSubmit={handleSignUpSubmit} className="space-y-4 text-base font-bold text-[--color-foreground] animate-fade-in duration-200">
            <div className="space-y-1">
              <label className="block text-[--color-foreground-muted]">{"ম্যানেজারের পূর্ণ নাম (বাংলায়)"}</label>
              <input
                type="text"
                required
                placeholder="যেমন: আব্দুর রহমান"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                className="input-field w-full text-base"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[--color-foreground-muted]">{"মোবাইল নম্বর"}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[--color-foreground-muted]" />
                <input
                  type="text"
                  required
                  placeholder="যেমন: 01712345678"
                  value={signUpMobile}
                  onChange={(e) => setSignUpMobile(e.target.value)}
                  className="input-field w-full pl-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[--color-foreground-muted]">{"পাসওয়ার্ড"}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[--color-foreground-muted]" />
                <input
                  type="password"
                  required
                  placeholder="নিরাপদ পাসওয়ার্ড লিখুন"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  className="input-field w-full pl-11 text-base"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-accent w-full py-3 text-lg font-black"
            >
              <UserPlus className="h-5 w-5" />
              <span>{"ম্যানেজার একাউন্ট তৈরি করুন"}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
