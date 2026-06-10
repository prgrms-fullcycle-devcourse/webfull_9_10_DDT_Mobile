// src/hooks/useYjsContract.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getToken } from '../lib/token'; // 토큰 가져오기 추가
import { useSocket } from '../contexts/SocketContext'; // 소켓 가져오기 추가

export interface Tier {
  tier: number;
  minPct: number;
  maxPct: number | null;
  count: number;
}

export interface Penalty {
  id: string;
  content: string;
}

export interface ContractFields {
  focusMin: number;
  breakMin: number;
  rounds: number;
}

export interface FocusedField {
  fieldKey: string;
  userId: string;
  nickname: string;
  color: string;
}

export interface AwarenessState {
  focusedField?: FocusedField | null;
  [key: string]: unknown;
}

export interface ApplyData {
  fields?: ContractFields;
  tiers?: Tier[];
  penalties?: Penalty[];
  penaltyMode?: 'replace' | 'append';
}

export interface UseContractYjsReturn {
  fields: ContractFields;
  fieldOwners: Record<string, FocusedField>;
  tiers: Tier[];
  penalties: Penalty[];
  isConnected: boolean;
  updateField: (key: keyof ContractFields, value: number) => void;
  addTier: () => void;
  updateTier: (index: number, updated: Partial<Tier>) => void;
  setTierBoundary: (index: number, maxPct: number) => void; // 정의 추가
  removeTier: (index: number) => void;
  addPenalty: (content: string) => void;
  updatePenalty: (index: number, content: string) => void;
  removePenalty: (index: number) => void;
  handleFocus: (fieldKey: string, userId: string, nickname: string) => void;
  handleBlur: () => void;
  applyAll: (data: ApplyData) => void;
}

function generateColor(userId: string): string {
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#33FFF5'];
  const index = userId.charCodeAt(0) % colors.length;
  return colors[index];
}

export function useYjsContract(
  roomCode: string,
  enabled: boolean,
  isHost: boolean,
): UseContractYjsReturn {
  const socket = useSocket();
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [fields, setFields] = useState<ContractFields>({ focusMin: 1, breakMin: 1, rounds: 1 });
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [fieldOwners, setFieldOwners] = useState<Record<string, FocusedField>>({});

  useEffect(() => {
    if (!roomCode || !enabled) return;

    const doc = new Y.Doc();
    docRef.current = doc;

    const yjsFields = doc.getMap<number>('fields');
    const yjsTiers = doc.getArray<Tier>('tiers');
    const yjsPenalties = doc.getArray<Penalty>('penalties');

    const apiDomain = process.env.EXPO_PUBLIC_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:8080';
    
    // 비동기로 토큰을 읽어온 후 웹소켓 프로바이더 초기화
    const initYjs = async () => {
      const token = await getToken() ?? '';
      const serverUrl = `${apiDomain}/yjs?roomCode=${roomCode}&token=${encodeURIComponent(token)}`;

      const provider = new WebsocketProvider(serverUrl, '', doc);
      const awareness = provider.awareness;

      const handleAwarenessChange = () => {
        const owners: Record<string, FocusedField> = {};
        (awareness.getStates() as Map<number, AwarenessState>).forEach((state, clientId) => {
          if (clientId === awareness.clientID) return;
          if (state.focusedField) {
            owners[state.focusedField.fieldKey] = state.focusedField;
          }
        });
        setFieldOwners(owners);
      };

      awareness.on('change', handleAwarenessChange);
      providerRef.current = provider;

      provider.on('status', ({ status }: { status: string }) => {
        setIsConnected(status === 'connected');
      });

      provider.on('sync', (isSynced: boolean) => {
        if (!isSynced) return;
        if (yjsFields.get('focusMin') === undefined) {
          setFields({ focusMin: 25, breakMin: 5, rounds: 4 });
        } else {
          setFields({
            focusMin: yjsFields.get('focusMin') ?? 25,
            breakMin: yjsFields.get('breakMin') ?? 5,
            rounds: yjsFields.get('rounds') ?? 4,
          });
        }
        
        const currentTiers = doc.getArray<Tier>('tiers');
        if (currentTiers.length === 0 && isHost) {
          doc.transact(() => {
            currentTiers.push([{ tier: 1, minPct: 0, maxPct: null, count: 0 }]);
          });
        }
      });

      yjsFields.observe((event) => {
        if (event.transaction.local) socket?.emit('contract:edited'); // 서명 리셋 브로드캐스트
        setFields({
          focusMin: yjsFields.get('focusMin') ?? 1,
          breakMin: yjsFields.get('breakMin') ?? 1,
          rounds: yjsFields.get('rounds') ?? 1,
        });
      });

      yjsTiers.observe((event) => {
        if (event.transaction.local) socket?.emit('contract:edited');
        setTiers(yjsTiers.toArray());
      });

      yjsPenalties.observe((event) => {
        if (event.transaction.local) socket?.emit('contract:edited');
        setPenalties(yjsPenalties.toArray());
      });
    };

    initYjs();

    return () => {
      providerRef.current?.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      setIsConnected(false);
    };
  }, [roomCode, enabled, isHost, socket]);

  const handleFocus = useCallback((fieldKey: string, userId: string, nickname: string) => {
    providerRef.current?.awareness.setLocalStateField('focusedField', {
      fieldKey,
      userId,
      nickname,
      color: generateColor(userId),
    });
  }, []);

  const handleBlur = useCallback(() => {
    providerRef.current?.awareness.setLocalStateField('focusedField', null);
  }, []);

  const updateField = useCallback((key: keyof ContractFields, value: number) => {
    docRef.current?.transact(() => {
      docRef.current?.getMap<number>('fields').set(key, value);
    });
  }, []);

  const addTier = useCallback(() => {
    const doc = docRef.current;
    if (!doc) return;
    const yjsTiers = doc.getArray<Tier>('tiers');
    const isFirst = yjsTiers.length === 0;
    const last = isFirst ? null : yjsTiers.get(yjsTiers.length - 1);
    const newMinPct = isFirst ? 0 : (last!.maxPct ?? last!.minPct + 1);

    doc.transact(() => {
      if (last) {
        yjsTiers.delete(yjsTiers.length - 1, 1);
        yjsTiers.insert(yjsTiers.length, [{ ...last, maxPct: newMinPct }]);
      }
      yjsTiers.push([{ tier: yjsTiers.length + 1, minPct: newMinPct, maxPct: null, count: 1 }]);
    });
  }, []);

  const updateTier = useCallback((index: number, updated: Partial<Tier>) => {
    const doc = docRef.current;
    if (!doc) return;
    const yjsTiers = doc.getArray<Tier>('tiers');
    const current = yjsTiers.get(index);
    doc.transact(() => {
      yjsTiers.delete(index, 1);
      yjsTiers.insert(index, [{ ...current, ...updated }]);
    });
  }, []);

  // 💡 누락되었던 setTierBoundary 추가 구현
  const setTierBoundary = useCallback((index: number, maxPct: number) => {
    const doc = docRef.current;
    if (!doc) return;

    const yjsTiers = doc.getArray<Tier>('tiers');
    const list = yjsTiers.toArray();
    if (index < 0 || index >= list.length - 1) return;

    doc.transact(() => {
      const rebuilt = list.map((t) => ({ ...t }));
      rebuilt[index].maxPct = maxPct;

      for (let j = index + 1; j < rebuilt.length; j++) {
        rebuilt[j].minPct = rebuilt[j - 1].maxPct ?? 0;
        if (j === rebuilt.length - 1) {
          rebuilt[j].maxPct = null;
        } else if (rebuilt[j].maxPct === null || (rebuilt[j].maxPct as number) <= rebuilt[j].minPct) {
          rebuilt[j].maxPct = Math.min(99, rebuilt[j].minPct + 1);
        }
      }
      yjsTiers.delete(0, yjsTiers.length);
      yjsTiers.insert(0, rebuilt);
    });
  }, []);

  const removeTier = useCallback((index: number) => {
    if (index === 0) return;
    const doc = docRef.current;
    if (!doc) return;
    const yjsTiers = doc.getArray<Tier>('tiers');

    doc.transact(() => {
      yjsTiers.delete(index, 1);
      const remaining = yjsTiers.toArray();
      const rebuilt = remaining.map((t, i) => ({
        ...t,
        tier: i + 1,
        minPct: i === 0 ? 0 : (remaining[i - 1].maxPct ?? 0),
      }));
      yjsTiers.delete(0, yjsTiers.length);
      yjsTiers.insert(0, rebuilt);
    });
  }, []);

  const addPenalty = useCallback((content: string) => {
    docRef.current?.transact(() => {
      docRef.current?.getArray<Penalty>('penalties').push([{ id: Math.random().toString(36).substring(7), content }]);
    });
  }, []);

  const updatePenalty = useCallback((index: number, content: string) => {
    const doc = docRef.current;
    if (!doc) return;
    const yjsPenalties = doc.getArray<Penalty>('penalties');
    const current = yjsPenalties.get(index);
    doc.transact(() => {
      yjsPenalties.delete(index, 1);
      yjsPenalties.insert(index, [{ ...current, content }]);
    });
  }, []);

  const removePenalty = useCallback((index: number) => {
    docRef.current?.transact(() => {
      docRef.current?.getArray<Penalty>('penalties').delete(index, 1);
    });
  }, []);

  const applyAll = useCallback((data: ApplyData) => {
    const doc = docRef.current;
    if (!doc) return;

    doc.transact(() => {
      if (data.fields) {
        const yjsFields = doc.getMap<number>('fields');
        yjsFields.set('focusMin', data.fields.focusMin);
        yjsFields.set('breakMin', data.fields.breakMin);
        yjsFields.set('rounds', data.fields.rounds);
      }
      if (data.tiers) {
        const yjsTiers = doc.getArray<Tier>('tiers');
        if (yjsTiers.length > 0) yjsTiers.delete(0, yjsTiers.length);
        if (data.tiers.length > 0) yjsTiers.insert(0, data.tiers);
      }
      if (data.penalties) {
        const yjsPenalties = doc.getArray<Penalty>('penalties');
        const mode = data.penaltyMode ?? 'replace';
        if (mode === 'replace') {
          if (yjsPenalties.length > 0) yjsPenalties.delete(0, yjsPenalties.length);
          if (data.penalties.length > 0) yjsPenalties.insert(0, data.penalties);
        } else {
          const newPenalties = data.penalties.map((p) => ({
            ...p,
            id: Math.random().toString(36).substring(7),
          }));
          if (newPenalties.length > 0) yjsPenalties.push(newPenalties);
        }
      }
    });
  }, []);

  return {
    fields,
    fieldOwners,
    tiers,
    penalties,
    isConnected,
    updateField,
    addTier,
    updateTier,
    setTierBoundary, // 노출 보장
    removeTier,
    addPenalty,
    updatePenalty,
    removePenalty,
    handleFocus,
    handleBlur,
    applyAll,
  };
}