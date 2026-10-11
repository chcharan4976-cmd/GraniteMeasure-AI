'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mountain,
  Plus,
  Search,
  MapPin,
  Building,
  FileCheck,
  Calendar,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/localization';
import { api, Quarry } from '@/lib/api';

export default function QuarriesPage() {
  const { t } = useTranslation();
  const [quarries, setQuarries] = useState<Quarry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newQuarry, setNewQuarry] = useState({
    name: '',
    location: '',
    district: 'Prakasam',
    mandal: 'Chimakurthy',
    village: '',
    lease_number: '',
    lease_holder: '',
  });

  const fetchQuarries = async () => {
    try {
      setLoading(true);
      const data = await api.getQuarries();
      if (Array.isArray(data)) {
        setQuarries(data);
      }
    } catch {
      // Mock quarries
      setQuarries([
        {
          id: 'q-chimakurthy-01',
          name: 'Chimakurthy Galaxy Leases #1',
          code: 'CHK-01',
          location: 'Chimakurthy Hills',
          district: 'Prakasam',
          mandal: 'Chimakurthy',
          village: 'R.L. Puram',
          lease_number: 'AP-PRK-GNT-2023-014',
          lease_holder: 'Galaxy Granites Pvt Ltd',
          active_blocks_count: 64,
          status: 'ACTIVE',
        },
        {
          id: 'q-chimakurthy-02',
          name: 'Budawada Galaxy Mining Zone',
          code: 'CHK-02',
          location: 'Budawada Survey 114',
          district: 'Prakasam',
          mandal: 'Chimakurthy',
          village: 'Budawada',
          lease_number: 'AP-PRK-GNT-2022-045',
          lease_holder: 'Royal Black Minerals Corp',
          active_blocks_count: 42,
          status: 'ACTIVE',
        },
        {
          id: 'q-khammam-02',
          name: 'Khammam Black Beauty Concession',
          code: 'KHM-02',
          location: 'Mudigonda Valley',
          district: 'Khammam',
          mandal: 'Mudigonda',
          village: 'Vallabhi',
          lease_number: 'AP-KHM-GNT-2022-088',
          lease_holder: 'Deccan Stone Works',
          active_blocks_count: 22,
          status: 'ACTIVE',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuarries();
  }, []);

  const handleCreateQuarry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.createQuarry({
        ...newQuarry,
        status: 'ACTIVE',
      }).catch(() => {
        // Fallback simulation
        const added: Quarry = {
          id: `q-${Date.now()}`,
          ...newQuarry,
          active_blocks_count: 0,
          status: 'ACTIVE',
        };
        setQuarries((prev) => [added, ...prev]);
      });
      setIsModalOpen(false);
      fetchQuarries();
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = quarries.filter(
    (q) =>
      (q.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.lease_number || q.lease_reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.lease_holder || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.district || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.village || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white flex items-center gap-2">
            <Mountain className="h-6 w-6 text-emerald-500" />
            <span>{t('quarries.title')}</span>
          </h1>
          <p className="mt-1 text-xs md:text-sm text-granite-500 dark:text-granite-400">
            {t('quarries.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {t('quarries.new_quarry')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="w-full md:w-96">
            <Input
              placeholder={`${t('common.search')} ${t('quarries.quarry_name')}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-granite-400" />}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)
        ) : (
          filtered.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card hoverEffect className="flex flex-col justify-between h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                        {q.district}
                      </span>
                      <CardTitle className="text-base mt-2">{q.name}</CardTitle>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="flex items-center gap-2 text-granite-600 dark:text-granite-400">
                    <MapPin className="h-3.5 w-3.5 text-granite-400 shrink-0" />
                    <span>
                      {q.village}, {q.mandal} Mandal
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-granite-600 dark:text-granite-400">
                    <FileCheck className="h-3.5 w-3.5 text-granite-400 shrink-0" />
                    <span className="font-mono">{q.lease_number}</span>
                  </div>

                  <div className="flex items-center gap-2 text-granite-600 dark:text-granite-400">
                    <Building className="h-3.5 w-3.5 text-granite-400 shrink-0" />
                    <span className="truncate">{q.lease_holder}</span>
                  </div>

                  <div className="pt-3 border-t border-granite-100 dark:border-granite-800 flex justify-between items-center text-xs">
                    <span className="text-granite-500">
                      {t('quarries.active_blocks')}:{' '}
                      <strong className="text-granite-900 dark:text-white">
                        {q.active_blocks_count ?? 0}
                      </strong>
                    </span>
                    <Button variant="ghost" size="sm">
                      Audit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('quarries.new_quarry')}
        description="Register a newly granted granite quarry concession and boundary parameters."
        maxWidth="md"
      >
        <form onSubmit={handleCreateQuarry} className="space-y-4">
          <Input
            label={t('quarries.quarry_name')}
            required
            value={newQuarry.name}
            onChange={(e) => setNewQuarry({ ...newQuarry, name: e.target.value })}
          />
          <Input
            label={t('quarries.lease_number')}
            placeholder="AP-PRK-GNT-2026-..."
            required
            value={newQuarry.lease_number}
            onChange={(e) => setNewQuarry({ ...newQuarry, lease_number: e.target.value })}
          />
          <Input
            label={t('quarries.lease_holder')}
            required
            value={newQuarry.lease_holder}
            onChange={(e) => setNewQuarry({ ...newQuarry, lease_holder: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('quarries.district')}
              value={newQuarry.district}
              onChange={(e) => setNewQuarry({ ...newQuarry, district: e.target.value })}
            />
            <Input
              label={t('quarries.mandal')}
              value={newQuarry.mandal}
              onChange={(e) => setNewQuarry({ ...newQuarry, mandal: e.target.value })}
            />
          </div>

          <Input
            label={t('quarries.village')}
            value={newQuarry.village}
            onChange={(e) => setNewQuarry({ ...newQuarry, village: e.target.value })}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-granite-100 dark:border-granite-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
