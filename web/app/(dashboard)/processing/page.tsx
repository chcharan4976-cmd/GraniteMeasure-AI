'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Play,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Camera,
  Layers,
  Ruler,
  FileCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/localization';
import { api, AnalysisJob } from '@/lib/api';

const PIPELINE_STAGES = [
  { id: 'quality_check', label: '1. Quality Check', icon: Camera },
  { id: 'feature_extraction', label: '2. Feature Matching', icon: Sparkles },
  { id: 'reconstruction', label: '3. 3D Mesh Reconstruction', icon: Layers },
  { id: 'measurement', label: '4. Volumetric Measurement', icon: Ruler },
];

export default function ProcessingPage() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalysisJobs();
      if (Array.isArray(data)) {
        setJobs(data);
      }
    } catch {
      // Mock active queue
      setJobs([
        {
          id: 'job-101',
          block_id: 'AP-PRK-BG-2026-082',
          job_type: 'full_pipeline',
          status: 'RUNNING',
          progress: 68,
          created_at: new Date(Date.now() - 420000).toISOString(),
        },
        {
          id: 'job-100',
          block_id: 'AP-PRK-BG-2026-081',
          job_type: 'full_pipeline',
          status: 'COMPLETED',
          progress: 100,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 3100000).toISOString(),
        },
        {
          id: 'job-099',
          block_id: 'AP-KHM-TK-2026-019',
          job_type: 'reconstruction',
          status: 'COMPLETED',
          progress: 100,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          completed_at: new Date(Date.now() - 6500000).toISOString(),
        },
        {
          id: 'job-098',
          block_id: 'AP-PRK-BG-2026-077',
          job_type: 'quality_check',
          status: 'FAILED',
          error_message: 'Insufficient parallax between camera frames (3/24 valid).',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleTriggerJob = async () => {
    setIsTriggering(true);
    try {
      await api.createAnalysisJob('AP-PRK-BG-2026-083', 'full_pipeline').catch(() => {
        // Fallback simulation
        const newJob: AnalysisJob = {
          id: `job-${Date.now()}`,
          block_id: 'AP-PRK-BG-2026-083',
          job_type: 'full_pipeline',
          status: 'RUNNING',
          progress: 15,
          created_at: new Date().toISOString(),
        };
        setJobs((prev) => [newJob, ...prev]);
      });
      fetchJobs();
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-purple-500" />
            <span>{t('processing.title')}</span>
          </h1>
          <p className="mt-1 text-xs md:text-sm text-granite-500 dark:text-granite-400">
            {t('processing.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            leftIcon={<RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isTriggering}
            onClick={handleTriggerJob}
            leftIcon={<Play className="h-4 w-4" />}
          >
            {t('processing.run_job')}
          </Button>
        </div>
      </div>

      {/* Visual Pipeline Stages */}
      <Card className="bg-gradient-to-r from-granite-900 to-slate-900 text-white border-granite-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Neural Photogrammetric Pipeline Stages
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {PIPELINE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-mono text-granite-400">STEP 0{idx + 1}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('processing.jobs_queue')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-granite-100 dark:divide-granite-800">
              {jobs.map((job) => (
                <div key={job.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-granite-900 dark:text-white font-mono">
                        {job.block_id}
                      </span>
                      <StatusBadge status={job.status} />
                      <span className="text-xs text-granite-400 font-mono">[{job.id}]</span>
                    </div>

                    <div className="text-xs text-granite-500 dark:text-granite-400 capitalize">
                      {(job.job_type || 'full_pipeline').replace('_', ' ')} • Started {new Date(job.created_at).toLocaleTimeString()}
                    </div>

                    {job.error_message && (
                      <p className="text-xs text-rose-500 font-medium">
                        Error: {job.error_message}
                      </p>
                    )}

                    {job.status === 'RUNNING' && typeof job.progress === 'number' && (
                      <div className="w-full max-w-md pt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-granite-400">
                          <span>Reconstructing Multi-View Stereo...</span>
                          <span className="font-bold text-emerald-500">{job.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-granite-200 dark:bg-granite-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Inspect Logs
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
