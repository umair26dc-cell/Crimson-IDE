/**
 * File & Component Templates for CsCode Crimson Code
 * Comprehensive boilerplate scaffolding for modern full-stack developers.
 */

import { LanguageId } from '../types';

export type TemplateCategory = 
  | 'React & UI' 
  | 'TypeScript & Logic' 
  | 'Backend & APIs' 
  | 'Python' 
  | 'Database & SQL' 
  | 'Testing & QA' 
  | 'DevOps & Config'
  | 'Systems (Go/Rust)';

export interface CodeTemplate {
  id: string;
  name: string;
  defaultFileName: string;
  language: LanguageId;
  category: TemplateCategory;
  description: string;
  tags?: string[];
  content: string;
}

export const CODE_TEMPLATES: CodeTemplate[] = [
  // ==========================================
  // REACT & UI
  // ==========================================
  {
    id: 'react-component',
    name: 'React Component (TSX)',
    defaultFileName: 'Card.tsx',
    language: 'typescript',
    category: 'React & UI',
    tags: ['react', 'tsx', 'ui', 'component'],
    description: 'Clean functional React component with typed props and Tailwind styling',
    content: `import React, { useState } from 'react';

export interface CardProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  description,
  badge,
  onAction,
  actionLabel = 'Explore',
  className = '',
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={\`p-5 rounded-xl bg-[#12131b] border border-rose-900/40 hover:border-rose-700/80 transition-all duration-200 shadow-lg shadow-black/40 \${className}\`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-tight">{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-950/80 text-rose-300 border border-rose-800/60">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="text-xs text-rose-400 font-mono mb-2">{subtitle}</div>
      )}

      {description && (
        <p className="text-xs text-slate-400 font-sans leading-relaxed mb-4">{description}</p>
      )}

      {children && <div className="mt-3 text-xs">{children}</div>}

      {onAction && (
        <div className="mt-4 pt-3 border-t border-[#1f2130] flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {isExpanded ? 'Show Less' : 'Details'}
          </button>
          <button
            onClick={onAction}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium font-sans transition-colors cursor-pointer"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};
`,
  },
  {
    id: 'react-hook',
    name: 'React Custom Hook (useLocalStorage)',
    defaultFileName: 'useLocalStorage.ts',
    language: 'typescript',
    category: 'React & UI',
    tags: ['react', 'hook', 'storage', 'state'],
    description: 'Type-safe reactive localStorage hook with cross-tab event synchronization',
    content: `import { useState, useEffect, useCallback } from 'react';

/**
 * Type-safe reactive localStorage hook with cross-tab synchronization.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Read initial stored value or fallback
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(\`[useLocalStorage] Error reading key "\${key}":\`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Set stored value and dispatch storage event
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const newValue = value instanceof Function ? value(storedValue) : value;
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setStoredValue(newValue);
        window.dispatchEvent(new Event('local-storage-change'));
      } catch (error) {
        console.warn(\`[useLocalStorage] Error setting key "\${key}":\`, error);
      }
    },
    [key, storedValue]
  );

  // Remove key from storage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(\`[useLocalStorage] Error removing key "\${key}":\`, error);
    }
  }, [key, initialValue]);

  // Sync state when storage changes across tabs or windows
  useEffect(() => {
    const handleStorageChange = () => setStoredValue(readValue());
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleStorageChange);
    };
  }, [readValue]);

  return [storedValue, setValue, removeValue];
}
`,
  },
  {
    id: 'react-context',
    name: 'React Context & Provider',
    defaultFileName: 'AuthContext.tsx',
    language: 'typescript',
    category: 'React & UI',
    tags: ['react', 'context', 'provider', 'auth'],
    description: 'Typed Context and Provider pattern with reducer and custom hook',
    content: `import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'developer' | 'viewer';
}

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check initial active session
    const saved = localStorage.getItem('cscode_auth_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('cscode_auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    // Simulate auth token exchange
    await new Promise((r) => setTimeout(r, 400));
    const mockUser: UserProfile = {
      id: \`usr_\${Date.now()}\`,
      email,
      name: email.split('@')[0],
      role: 'developer',
    };
    setUser(mockUser);
    localStorage.setItem('cscode_auth_user', JSON.stringify(mockUser));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cscode_auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
`,
  },
  {
    id: 'hero-section',
    name: 'Modern Hero Section (TSX)',
    defaultFileName: 'HeroSection.tsx',
    language: 'typescript',
    category: 'React & UI',
    tags: ['react', 'hero', 'landing', 'ui'],
    description: 'High-impact landing hero section with glowing crimson gradient accent',
    content: `import React from 'react';

export interface HeroSectionProps {
  headline?: string;
  subheadline?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  headline = 'Engineered for Performance',
  subheadline = 'CsCode Crimson Code delivers instant syntax acceleration, split-view editing, and full terminal control.',
  onPrimaryClick,
  onSecondaryClick,
}) => {
  return (
    <section className="relative overflow-hidden py-16 px-6 lg:px-12 bg-[#090a10] border-b border-[#1b1c28]">
      {/* Background Radial Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-rose-600/15 rounded-full blur-[100px] pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-950/70 border border-rose-700/60 text-rose-300 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          <span>CsCode Developer Preview</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          {headline}
        </h1>

        <p className="text-base md:text-lg text-slate-300 font-sans max-w-2xl mx-auto leading-relaxed">
          {subheadline}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onPrimaryClick}
            className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-all shadow-lg shadow-rose-900/40 cursor-pointer"
          >
            Launch Workspace
          </button>
          <button
            onClick={onSecondaryClick}
            className="px-5 py-2.5 rounded-lg bg-[#141622] hover:bg-[#1e2030] text-slate-300 border border-[#2b2e42] hover:text-white font-mono text-sm transition-colors cursor-pointer"
          >
            Read Documentation
          </button>
        </div>
      </div>
    </section>
  );
};
`,
  },
  {
    id: 'css-theme',
    name: 'CSS Stylesheet',
    defaultFileName: 'style.css',
    language: 'css',
    category: 'React & UI',
    tags: ['css', 'styling'],
    description: 'Basic CSS stylesheet with an empty CSS block',
    content: `* {

}
`,
  },

  // ==========================================
  // TYPESCRIPT & LOGIC
  // ==========================================
  {
    id: 'ts-module',
    name: 'TypeScript Utility Module',
    defaultFileName: 'utils.ts',
    language: 'typescript',
    category: 'TypeScript & Logic',
    tags: ['typescript', 'utils', 'helpers'],
    description: 'Typed helper functions: debounce, throttle, clamp, formatBytes, safeJson',
    content: `/**
 * Core Utility Functions
 */

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number): T {
  let timer: any = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  }) as T;
}

export function throttle<T extends (...args: any[]) => void>(fn: T, limitMs: number): T {
  let inThrottle = false;
  return ((...args: any[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limitMs);
    }
  }) as T;
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
`,
  },
  {
    id: 'event-emitter',
    name: 'Typed Event Emitter / Bus',
    defaultFileName: 'EventEmitter.ts',
    language: 'typescript',
    category: 'TypeScript & Logic',
    tags: ['typescript', 'events', 'pubsub', 'architecture'],
    description: 'Decoupled Publish/Subscribe event bus with strict TypeScript type contracts',
    content: `type EventCallback<T = any> = (data: T) => void;

/**
 * Type-safe Publish / Subscribe Event Dispatcher.
 */
export class EventEmitter<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<EventCallback>>();

  public on<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Unsubscribe handle
    return () => this.off(event, callback);
  }

  public off<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(\`[EventEmitter] Error in listener for event "\${String(event)}":\`, err);
        }
      });
    }
  }

  public once<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): () => void {
    const wrapper = (data: Events[K]) => {
      this.off(event, wrapper);
      callback(data);
    };
    return this.on(event, wrapper);
  }

  public clear(): void {
    this.listeners.clear();
  }
}
`,
  },
  {
    id: 'lru-cache',
    name: 'LRU Cache Algorithm',
    defaultFileName: 'LRUCache.ts',
    language: 'typescript',
    category: 'TypeScript & Logic',
    tags: ['typescript', 'cache', 'algorithms', 'datastructures'],
    description: 'O(1) Least Recently Used cache implementation with capacity management',
    content: `interface CacheNode<K, V> {
  key: K;
  value: V;
  prev?: CacheNode<K, V>;
  next?: CacheNode<K, V>;
}

/**
 * O(1) Doubly Linked List + Map LRU Cache.
 */
export class LRUCache<K, V> {
  private capacity: number;
  private map = new Map<K, CacheNode<K, V>>();
  private head: CacheNode<K, V>;
  private tail: CacheNode<K, V>;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error('Capacity must be > 0');
    this.capacity = capacity;
    this.head = {} as CacheNode<K, V>;
    this.tail = {} as CacheNode<K, V>;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  public get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToHead(node);
    return node.value;
  }

  public put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    const newNode: CacheNode<K, V> = { key, value };
    this.map.set(key, newNode);
    this.addNode(newNode);

    if (this.map.size > this.capacity) {
      const removed = this.popTail();
      if (removed) this.map.delete(removed.key);
    }
  }

  public size(): number {
    return this.map.size;
  }

  private addNode(node: CacheNode<K, V>) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private removeNode(node: CacheNode<K, V>) {
    const prev = node.prev!;
    const next = node.next!;
    prev.next = next;
    next.prev = prev;
  }

  private moveToHead(node: CacheNode<K, V>) {
    this.removeNode(node);
    this.addNode(node);
  }

  private popTail(): CacheNode<K, V> | undefined {
    const node = this.tail.prev;
    if (node && node !== this.head) {
      this.removeNode(node);
      return node;
    }
    return undefined;
  }
}
`,
  },
  {
    id: 'result-monad',
    name: 'Result & Async Error Monad',
    defaultFileName: 'result.ts',
    language: 'typescript',
    category: 'TypeScript & Logic',
    tags: ['typescript', 'fp', 'error-handling', 'monad'],
    description: 'Functional Result<T, E> type to eliminate unhandled promise rejections',
    content: `export type Result<T, E = Error> =
  | { success: true; value: T; error?: never }
  | { success: false; error: E; value?: never };

export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

export function err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Execute an async operation safely without throwing exceptions.
 */
export async function tryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    return err(error as E);
  }
}

/**
 * Execute a synchronous callback safely.
 */
export function tryCatchSync<T, E = Error>(
  fn: () => T
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error as E);
  }
}
`,
  },

  // ==========================================
  // BACKEND & APIS
  // ==========================================
  {
    id: 'api-client',
    name: 'REST API Client with Retry & Timeout',
    defaultFileName: 'apiClient.ts',
    language: 'typescript',
    category: 'Backend & APIs',
    tags: ['api', 'fetch', 'client', 'http'],
    description: 'Robust HTTP client with request headers, error parsing, and retry mechanics',
    content: `export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  getAuthToken?: () => string | null;
}

export class ApiClient {
  private baseUrl: string;
  private timeoutMs: number;
  private getAuthToken?: () => string | null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\\/+$/, '');
    this.timeoutMs = config.timeoutMs || 8000;
    this.getAuthToken = config.getAuthToken;
  }

  public async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(path + queryString, { method: 'GET' });
  }

  public async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = \`\${this.baseUrl}/\${path.replace(/^\\/+/, '')}\`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers as Record<string, string>),
    };

    if (this.getAuthToken) {
      const token = this.getAuthToken();
      if (token) headers['Authorization'] = \`Bearer \${token}\`;
    }

    try {
      const res = await fetch(url, { ...init, headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || \`HTTP error \${res.status}\`);
      }

      return (await res.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(\`Request timed out after \${this.timeoutMs}ms\`);
      }
      throw err;
    }
  }
}
`,
  },
  {
    id: 'node-server',
    name: 'Express API Server Route',
    defaultFileName: 'route.ts',
    language: 'typescript',
    category: 'Backend & APIs',
    tags: ['express', 'node', 'api', 'server'],
    description: 'REST API route handler with request validation and status response',
    content: `export interface ApiRequest<T = any> {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: T;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  status: number;
  data?: T;
  error?: string;
  timestamp: string;
}

export async function handleApiRoute(req: ApiRequest): Promise<ApiResponse> {
  console.log(\`[\${req.method}] \${req.path}\`);

  switch (req.method) {
    case 'GET':
      return {
        status: 200,
        data: {
          status: 'online',
          workspace: 'CsCode Crimson Code',
          uptimeSec: Math.floor(process.uptime()),
        },
        timestamp: new Date().toISOString(),
      };

    case 'POST':
      if (!req.body) {
        return {
          status: 400,
          error: 'Missing JSON payload',
          timestamp: new Date().toISOString(),
        };
      }
      return {
        status: 201,
        data: { received: req.body, processedAt: Date.now() },
        timestamp: new Date().toISOString(),
      };

    default:
      return {
        status: 405,
        error: \`Method \${req.method} not allowed\`,
        timestamp: new Date().toISOString(),
      };
  }
}
`,
  },
  {
    id: 'ws-client',
    name: 'WebSocket Real-time Client',
    defaultFileName: 'socketClient.ts',
    language: 'typescript',
    category: 'Backend & APIs',
    tags: ['websocket', 'realtime', 'network'],
    description: 'Resilient WebSocket connection with automatic reconnection backoff',
    content: `export interface WsMessage<T = any> {
  event: string;
  payload: T;
  id?: string;
}

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners = new Map<string, Set<(payload: any) => void>>();

  constructor(url: string) {
    this.url = url;
  }

  public connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          const handlers = this.listeners.get(msg.event);
          if (handlers) handlers.forEach((fn) => fn(msg.payload));
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        console.warn('[WebSocket] Closed. Attempting reconnect...');
        this.handleReconnect();
      };
    } catch (e) {
      this.handleReconnect();
    }
  }

  public on<T = any>(event: string, callback: (payload: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  public send(event: string, payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload }));
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    }
  }
}
`,
  },

  // ==========================================
  // PYTHON
  // ==========================================
  {
    id: 'python-fastapi',
    name: 'FastAPI Web Microservice',
    defaultFileName: 'main.py',
    language: 'python',
    category: 'Python',
    tags: ['python', 'fastapi', 'api', 'backend'],
    description: 'FastAPI application with Pydantic request models and CORS middleware',
    content: `"""
FastAPI Microservice Template for CsCode
Run with: uvicorn main:app --reload --port 8000
"""

from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="CsCode Microservice API",
    version="1.0.0",
    description="High-performance async Python backend",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProjectItem(BaseModel):
    id: str = Field(..., example="proj-101")
    title: str = Field(..., max_length=100)
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


# In-memory storage mock
DATABASE: List[ProjectItem] = [
    ProjectItem(id="1", title="Crimson Core", description="Core engine runtime", tags=["kernel", "cscode"])
]


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "cscode-backend"}


@app.get("/projects", response_model=List[ProjectItem], tags=["Projects"])
async def list_projects():
    return DATABASE


@app.post("/projects", response_model=ProjectItem, status_code=status.HTTP_201_CREATED, tags=["Projects"])
async def create_project(item: ProjectItem):
    if any(p.id == item.id for p in DATABASE):
        raise HTTPException(status_code=400, detail="Project with ID already exists")
    DATABASE.append(item)
    return item
`,
  },
  {
    id: 'python-cli',
    name: 'Python CLI & Data Tool',
    defaultFileName: 'cli.py',
    language: 'python',
    category: 'Python',
    tags: ['python', 'cli', 'argparse', 'tooling'],
    description: 'Structured command line interface with subcommands and formatted logging',
    content: `#!/usr/bin/env python3
"""
Command Line Developer Utility
Usage: python cli.py inspect --path ./src
"""

import argparse
import json
import os
import sys
from pathlib import Path


def inspect_directory(target_path: str):
    p = Path(target_path)
    if not p.exists():
        print(f"Error: Path '{target_path}' does not exist.", file=sys.stderr)
        sys.exit(1)

    stats = {
        "path": str(p.resolve()),
        "is_dir": p.is_dir(),
        "files_count": len([f for f in p.rglob("*") if f.is_file()]) if p.is_dir() else 1,
    }
    print(json.dumps(stats, indent=2))


def main():
    parser = argparse.ArgumentParser(description="CsCode Developer CLI Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Inspect subcommand
    inspect_parser = subparsers.add_parser("inspect", help="Inspect workspace paths")
    inspect_parser.add_argument("--path", "-p", default=".", help="Target directory or file")

    args = parser.parse_args()

    if args.command == "inspect":
        inspect_directory(args.path)


if __name__ == "__main__":
    main()
`,
  },

  // ==========================================
  // DATABASE & SQL
  // ==========================================
  {
    id: 'sql-schema',
    name: 'PostgreSQL Relational Schema',
    defaultFileName: 'schema.sql',
    language: 'sql',
    category: 'Database & SQL',
    tags: ['sql', 'postgres', 'database', 'ddl'],
    description: 'Production-ready database DDL schema with UUIDs, indexes, and timestamps',
    content: `-- CsCode PostgreSQL Database Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'developer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Projects Index Table
CREATE TABLE IF NOT EXISTS project_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    language VARCHAR(50) NOT NULL,
    checksum VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_workspace_path UNIQUE (workspace_id, file_path)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON project_files(workspace_id, file_path);
`,
  },
  {
    id: 'sql-seed',
    name: 'Database Seed & Verification Script',
    defaultFileName: 'seed.sql',
    language: 'sql',
    category: 'Database & SQL',
    tags: ['sql', 'seed', 'data', 'test'],
    description: 'Seed sample records with transactions and ON CONFLICT handling',
    content: `-- Seed Initial Development Records
BEGIN;

INSERT INTO users (id, email, full_name, role)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'dev@cscode.io', 'Lead Developer', 'admin'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'reviewer@cscode.io', 'Code Reviewer', 'developer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO workspaces (id, owner_id, name, settings)
VALUES (
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Crimson Code Studio',
    '{"theme": "Crimson Ruby", "tabSize": 2}'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify Seed Results
SELECT u.email, w.name, w.created_at 
FROM workspaces w 
JOIN users u ON w.owner_id = u.id;
`,
  },

  // ==========================================
  // TESTING & QA
  // ==========================================
  {
    id: 'vitest-suite',
    name: 'Vitest / Jest Unit Test Suite',
    defaultFileName: 'utils.test.ts',
    language: 'typescript',
    category: 'Testing & QA',
    tags: ['testing', 'vitest', 'jest', 'unit-test'],
    description: 'Complete test suite with describe blocks, assertions, and mock spies',
    content: `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clamp, formatBytes, debounce } from './utils';

describe('Utility Test Suite', () => {
  describe('clamp()', () => {
    it('constrains values above maximum bound', () => {
      expect(clamp(150, 0, 100)).toBe(100);
    });

    it('constrains values below minimum bound', () => {
      expect(clamp(-20, 0, 100)).toBe(0);
    });

    it('preserves values within range', () => {
      expect(clamp(42, 0, 100)).toBe(42);
    });
  });

  describe('formatBytes()', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('formats megabytes with precision', () => {
      expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
    });
  });

  describe('debounce()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('delays execution until delay period has elapsed', () => {
      const mockFn = vi.fn();
      const debounced = debounce(mockFn, 300);

      debounced();
      debounced();
      debounced();

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
`,
  },

  // ==========================================
  // SYSTEMS (GO / RUST)
  // ==========================================
  {
    id: 'go-server',
    name: 'Go HTTP Server & Mux',
    defaultFileName: 'main.go',
    language: 'go',
    category: 'Systems (Go/Rust)',
    tags: ['go', 'golang', 'server', 'http'],
    description: 'Idiomatic Go standard library HTTP router with JSON handlers and graceful shutdown',
    content: `package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type HealthResponse struct {
	Status    string    \`json:"status"\`
	Timestamp time.Time \`json:"timestamp"\`
	Version   string    \`json:"version"\`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	resp := HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Version:   "1.0.0",
	}

	_ = json.NewEncoder(w).Encode(resp)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)

	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Println("CsCode Go Microservice running on http://localhost:8080")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %s\\n", err)
	}
}
`,
  },
  {
    id: 'rust-cli',
    name: 'Rust Binary & CLI Engine',
    defaultFileName: 'main.rs',
    language: 'rust',
    category: 'Systems (Go/Rust)',
    tags: ['rust', 'cli', 'systems'],
    description: 'Safe Rust binary with error handling and formatted output',
    content: `use std::env;
use std::fs;
use std::io::Result;

#[derive(Debug)]
struct WorkspaceStats {
    total_files: usize,
    total_bytes: u64,
}

fn inspect_dir(path: &str) -> Result<WorkspaceStats> {
    let mut stats = WorkspaceStats {
        total_files: 0,
        total_bytes: 0,
    };

    let entries = fs::read_dir(path)?;
    for entry in entries.flatten() {
        let metadata = entry.metadata()?;
        if metadata.is_file() {
            stats.total_files += 1;
            stats.total_bytes += metadata.len();
        }
    }

    Ok(stats)
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let target = args.get(1).map(|s| s.as_str()).unwrap_or(".");

    println!("CsCode Rust Inspection Engine");
    println!("Scanning path: {}", target);

    match inspect_dir(target) {
        Ok(stats) => {
            println!("Analysis complete: {} files found, {} bytes total", stats.total_files, stats.total_bytes);
        }
        Err(e) => {
            eprintln!("Inspection error: {}", e);
        }
    }
}
`,
  },

  // ==========================================
  // DEVOPS & CONFIG
  // ==========================================
  {
    id: 'dockerfile-multistage',
    name: 'Multi-Stage Dockerfile',
    defaultFileName: 'Dockerfile',
    language: 'plaintext',
    category: 'DevOps & Config',
    tags: ['docker', 'devops', 'container'],
    description: 'Optimized multi-stage container build with security non-root user',
    content: `# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Minimal Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security: Run as unprivileged node user
USER node

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
`,
  },
  {
    id: 'github-ci',
    name: 'GitHub Actions CI/CD Workflow',
    defaultFileName: 'ci.yml',
    language: 'yaml',
    category: 'DevOps & Config',
    tags: ['github', 'actions', 'ci', 'workflow'],
    description: 'Complete continuous integration pipeline with linting, testing, and caching',
    content: `name: Continuous Integration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Lint, Test & Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Type Check & Lint
        run: npm run lint

      - name: Run Test Suite
        run: npm test -- --coverage

      - name: Production Build
        run: npm run build
`,
  },
  {
    id: 'html-modern',
    name: 'HTML5 Starter',
    defaultFileName: 'index.html',
    language: 'html',
    category: 'React & UI',
    tags: ['html', 'starter', 'web'],
    description: 'Clean HTML5 document without title and with an empty CSS style block',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>

  </style>
</head>
<body>

</body>
</html>
`,
  },
  {
    id: 'markdown-doc',
    name: 'Markdown Documentation & Spec',
    defaultFileName: 'SPEC.md',
    language: 'markdown',
    category: 'DevOps & Config',
    tags: ['markdown', 'spec', 'docs'],
    description: 'Technical document with tables, checklists, and code snippets',
    content: `# Architecture Specification

Overview of system design, performance targets, and API contracts for the project.

## Key Targets
- [x] Sub-10ms buffer rendering latency
- [x] Sandboxed TypeScript code execution
- [ ] Offline WebWorker thread persistence

## API Endpoints

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| \`GET\` | \`/api/health\` | Health and uptime | \`200 OK\` |
| \`POST\` | \`/api/eval\` | Code runner evaluator | \`200 OK\` |

## Code Example
\`\`\`typescript
import { ApiClient } from './apiClient';

const client = new ApiClient({ baseUrl: 'https://api.cscode.io' });
const status = await client.get('/health');
console.log('Status:', status);
\`\`\`
`,
  },
  {
    id: 'json-config',
    name: 'JSON Config Manifest',
    defaultFileName: 'config.json',
    language: 'json',
    category: 'DevOps & Config',
    tags: ['json', 'config', 'manifest'],
    description: 'Standard JSON configuration schema',
    content: `{
  "name": "cscode-project",
  "version": "1.0.0",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true
  },
  "scripts": {
    "build": "tsc && vite build",
    "start": "node dist/server.js",
    "test": "vitest run"
  }
}
`,
  },
];
