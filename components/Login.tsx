import React, { useState } from 'react';
import { useStore } from '../store';

const Login: React.FC = () => {
  const [code, setCode] = useState('');
  const authenticate = useStore((state) => state.authenticate);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      authenticate(code.trim());
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden p-6">
      {/* Login Frame */}
      <div className="bg-zinc-950/40 backdrop-blur-md border-2 border-cyan-500/80 w-full max-w-lg p-10 flex flex-col items-center gap-8 shadow-[0_0_60px_rgba(6,182,212,0.4)] animate-in fade-in zoom-in duration-500">
        
        <div className="text-center space-y-4">
          <h1 className="font-orbitron text-4xl font-black text-cyan-400 tracking-[0.3em] uppercase neon-text">
            SOLO SYSTEM
          </h1>
          <p className="text-zinc-400 text-[13px] font-bold tracking-[0.1em] uppercase leading-relaxed max-w-sm">
            Enter your personal code to access your data from any device
          </p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your code..."
            className="w-full bg-zinc-950/60 border-2 border-cyan-500/40 px-6 py-4 text-white font-black tracking-widest text-center focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all placeholder:opacity-30 uppercase"
          />
          <button
            type="submit"
            className="w-full py-4 bg-cyan-900/60 border-2 border-cyan-500 text-cyan-400 font-black tracking-[0.4em] uppercase hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)]"
          >
            ENTER
          </button>
        </form>

        <p className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase text-center mt-2">
          Use any unique code (e.g., your name, username, or random text)
        </p>
      </div>
    </div>
  );
};

export default Login;