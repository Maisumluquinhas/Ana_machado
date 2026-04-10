import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Movement } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { History, ArrowUpRight, ArrowDownRight, Search, Filter, Package } from 'lucide-react';
import { Input } from '../components/ui/input';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

export default function Movements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'movements'), orderBy('date', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movement)));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredMovements = movements.filter(m => 
    (m as any).variationInfo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-10 h-10 border-4 border-boutique-rose border-t-boutique-gold rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-serif font-bold text-boutique-dark">Histórico de Movimentações</h2>
        <p className="text-gray-500 mt-1">Rastreie todas as entradas e saídas de estoque.</p>
      </div>

      <Card className="boutique-card border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-50 pb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Filtrar por variação ou motivo..."
              className="pl-12 h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-boutique-rose/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableHead className="pl-6 py-4">Tipo</TableHead>
                  <TableHead>Variação</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead className="pr-6">Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <History size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhuma movimentação registrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m) => (
                    <TableRow key={m.id} className="hover:bg-boutique-rose/5 transition-colors border-b border-gray-50">
                      <TableCell className="pl-6 py-4">
                        <div className={cn(
                          "flex items-center gap-2 font-bold",
                          m.type === 'entry' ? "text-green-600" : "text-red-600"
                        )}>
                          {m.type === 'entry' ? (
                            <div className="p-1.5 bg-green-50 rounded-lg"><ArrowUpRight size={16} /></div>
                          ) : (
                            <div className="p-1.5 bg-red-50 rounded-lg"><ArrowDownRight size={16} /></div>
                          )}
                          {m.type === 'entry' ? 'Entrada' : 'Saída'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package size={16} className="text-gray-300" />
                          <span className="font-medium text-boutique-dark">{(m as any).variationInfo}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">{m.quantity} un</span>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {format(parseISO(m.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="pr-6">
                        <span className="text-sm text-gray-400 italic">{m.reason || '—'}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
