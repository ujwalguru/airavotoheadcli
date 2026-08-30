/**
 * PosTesterModal Component
 * Interactive tester for the public GET /api/pos/verify endpoint
 * and ready-to-use Python POS verification example code.
 */

import React, { useState } from 'react';
import { X, Play, Terminal, Check, Copy, AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react';
import { Cafe, VerifyResponse } from '../types';

interface PosTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafes: Cafe[];
}

export const PosTesterModal: React.FC<PosTesterModalProps> = ({
  isOpen,
  onClose,
  cafes,
}) => {
  const [selectedCafeId, setSelectedCafeId] = useState<string>(
    cafes.length > 0 ? String(cafes[0].id) : '1'
  );
  const [apiKeyInput, setApiKeyInput] = useState<string>(
    cafes.length > 0 ? cafes[0].api_key : ''
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  if (!isOpen) return null;

  const handleCafeSelect = (idStr: string) => {
    setSelectedCafeId(idStr);
    const cafe = cafes.find((c) => String(c.id) === idStr);
    if (cafe) {
      setApiKeyInput(cafe.api_key);
    }
  };

  const handleTestVerify = async () => {
    setLoading(true);
    setResult(null);

    try {
      const url = `/api/pos/verify?cafe_id=${encodeURIComponent(selectedCafeId)}&api_key=${encodeURIComponent(apiKeyInput.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        valid: false,
        status: 'error',
        message: err.message || 'Failed to connect to verification server',
      });
    } finally {
      setLoading(false);
    }
  };

  const pythonExampleCode = `import sys
import requests
import json
import os
import socket

# Configuration stored locally in the POS application
SERVER_URL = "http://localhost:3000"  # Or your deployed cloud URL
CONFIG_FILE = "pos_config.json"

def get_or_register_credentials():
    """
    Check for existing credentials, otherwise auto-register this POS terminal.
    """
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            print("[*] Found existing POS credentials.")
            return json.load(f)
            
    print("[*] No credentials found. Auto-registering POS terminal...")
    try:
        machine_name = socket.gethostname()
        response = requests.post(
            f"{SERVER_URL}/api/pos/register",
            json={
                "machine_id": machine_name,
                "cafe_name": f"New POS - {machine_name}"
            },
            timeout=5
        )
        data = response.json()
        
        if data.get("success"):
            creds = {
                "id": data["id"],
                "key": data["api_key"]
            }
            with open(CONFIG_FILE, 'w') as f:
                json.dump(creds, f)
            print(f"[✓] Auto-registered successfully as Cafe #{creds['id']}.")
            return creds
        else:
            print(f"[!] Auto-registration failed: {data.get('message')}")
            sys.exit(1)
            
    except Exception as e:
        print(f"[!] Could not auto-register POS: {e}")
        sys.exit(1)

def verify_license_on_startup():
    """
    Calls GET /api/pos/verify with cafe_id and api_key.
    Validates license before starting the POS software UI.
    """
    creds = get_or_register_credentials()
    cafe_id = creds["id"]
    api_key = creds["key"]
    
    print(f"[*] Verifying POS license for Cafe #{cafe_id}...")
    
    try:
        response = requests.get(
            f"{SERVER_URL}/api/pos/verify",
            params={
                "cafe_id": cafe_id,
                "api_key": api_key
            },
            timeout=5
        )
        
        data = response.json()
        status = data.get("status")
        valid = data.get("valid", False)
        message = data.get("message", "")
        
        if valid and status == "active":
            cafe_name = data.get("cafe_name", "Cafe")
            print(f"[✓] License verified! Welcome, {cafe_name}.")
            return True
            
        elif status == "suspended":
            print(f"\\n[!] ERROR: LICENSE SUSPENDED.")
            print(f"[!] Reason: {message}")
            print("[!] Please contact support or the software administrator to reactivate your license.\\n")
            sys.exit(1)
            
        elif status == "not_found":
            print(f"\\n[!] ERROR: INVALID CREDENTIALS.")
            print(f"[!] Reason: {message}")
            print("[!] Check your Cafe ID and API Key in pos_config.json\\n")
            sys.exit(1)
            
        else:
            print(f"[!] Unknown verification status: {status}")
            sys.exit(1)

    except requests.exceptions.RequestException as e:
        print(f"[!] Failed to reach verification server: {e}")
        print("[!] Cannot verify license on startup. Exiting...")
        sys.exit(1)

if __name__ == "__main__":
    # 1. Run mandatory verification on startup
    verify_license_on_startup()
    
    # 2. If valid, proceed with POS application startup
    print("[*] Starting POS Terminal interface...")
`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pythonExampleCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-neutral-800 text-purple-500 border border-neutral-700">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">POS Verification API & Python Client</h2>
              <p className="text-xs text-neutral-400">
                Test <code className="text-purple-500">GET /api/pos/verify</code> & view client startup logic
              </p>
            </div>
          </div>
          <button
            id="close-pos-tester-modal-btn"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Live Interactive Endpoint Tester */}
          <div className="bg-black border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-500" />
                Live Endpoint Tester
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 bg-neutral-900 text-neutral-400 border border-neutral-800 rounded">
                PUBLIC · GET /api/pos/verify
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Cafe Selector / Cafe ID input */}
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Select Cafe or Enter ID
                </label>
                {cafes.length > 0 ? (
                  <select
                    id="pos-test-cafe-select"
                    value={selectedCafeId}
                    onChange={(e) => handleCafeSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    {cafes.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.cafe_name} ({c.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={selectedCafeId}
                    onChange={(e) => setSelectedCafeId(e.target.value)}
                    placeholder="Cafe ID (e.g. 1)"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                )}
              </div>

              {/* API Key input */}
              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  API Key
                </label>
                <input
                  id="pos-test-api-key-input"
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="32-character API key"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Test Button */}
              <div className="md:col-span-2 flex items-end">
                <button
                  id="execute-pos-verify-test-btn"
                  type="button"
                  onClick={handleTestVerify}
                  disabled={loading || !selectedCafeId || !apiKeyInput}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Verify</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Result Display */}
            {result && (
              <div
                className={`p-4 rounded-lg border text-xs font-mono transition animate-in fade-in duration-100 ${
                  result.valid
                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-500'
                    : result.status === 'suspended'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-2 font-sans font-semibold text-sm">
                  {result.valid ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                      <span>Status: AUTHORIZED (active)</span>
                    </>
                  ) : result.status === 'suspended' ? (
                    <>
                      <ShieldX className="w-4 h-4 text-rose-500" />
                      <span>Status: SUSPENDED (blocked)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span>Status: NOT FOUND (invalid credentials)</span>
                    </>
                  )}
                </div>
                <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed bg-black/40 p-2.5 rounded border border-white/5">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Section 2: Python POS Verification Example */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-200">
                  Python POS Client Startup Implementation
                </h3>
                <p className="text-xs text-neutral-400">
                  Integrate into your local POS software startup sequence
                </p>
              </div>
              <button
                id="copy-python-code-btn"
                type="button"
                onClick={handleCopyCode}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  codeCopied
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                }`}
              >
                {codeCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black">
              <pre className="p-4 text-xs font-mono text-neutral-300 overflow-x-auto leading-relaxed">
                {pythonExampleCode}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-neutral-800 bg-neutral-900 shrink-0">
          <button
            id="close-pos-tester-footer-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
