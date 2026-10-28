'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { getUsersWithProfilesAndSubscriptions } from '../actions';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { SortDescriptor } from '@/lib/types';
import { UsersOverviewTable, UsersProfilesTable } from './users-table-sections';
import { getTrialMeta, type SortableColumns, type UserData } from './user-table-types';

export default function UsersTable() {
  const router = useRouter(); // Initialize router
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTrial, setFilterTrial] = useState<'all' | 'active' | 'ended' | 'none'>('all');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor<SortableColumns>>({
    column: 'created_at',
    direction: 'descending',
  });

  // Dynamically get unique plans and statuses for filter dropdowns (Moved before conditional returns)
  const uniquePlans = useMemo(() => {
    const plans = new Set(users.map(u => u.subscription?.subscription_plan || 'none'));
    return ['all', ...Array.from(plans)];
  }, [users]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(users.map(u => u.subscription?.subscription_status || 'none'));
    return ['all', ...Array.from(statuses)];
  }, [users]);
  
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const data = await getUsersWithProfilesAndSubscriptions();
        setUsers(data as unknown as UserData[]);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const handleSort = (column: SortableColumns) => {
    setSortDescriptor((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    }));
  };

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      // Subscription Plan Filter
      const plan = item.subscription?.subscription_plan || 'none';
      if (filterPlan !== 'all' && plan !== filterPlan) {
        return false;
      }
      
      // Subscription Status Filter
      const status = item.subscription?.subscription_status || 'none';
       if (filterStatus !== 'all' && status !== filterStatus) {
        return false;
      }

      // Trial Filter
      const trialMeta = getTrialMeta(item.subscription?.trial_end ?? null);
      if (filterTrial === 'active' && !trialMeta.isTrialing) {
        return false;
      }
      if (filterTrial === 'ended' && !trialMeta.isExpired) {
        return false;
      }
      if (filterTrial === 'none' && trialMeta.hasTrial) {
        return false;
      }

      // Search Term Filter (if searchTerm is present)
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const name = item.profile?.first_name && item.profile?.last_name
          ? `${item.profile.first_name} ${item.profile.last_name}`.toLowerCase()
          : '';
        const email = item.user.email?.toLowerCase() || '';
        const location = item.profile?.location?.toLowerCase() || '';
        // Plan and status already checked above, but include in search text
        const planText = item.subscription?.subscription_plan?.toLowerCase() || '';
        const statusText = item.subscription?.subscription_status?.toLowerCase() || '';

        return (
          email.includes(lowerSearchTerm) ||
          name.includes(lowerSearchTerm) ||
          location.includes(lowerSearchTerm) ||
          planText.includes(lowerSearchTerm) || // Allow searching plan/status text too
          statusText.includes(lowerSearchTerm)
        );
      }
      
      // If no search term and passed plan/status filters, include the user
      return true;
    });
  }, [users, searchTerm, filterPlan, filterStatus, filterTrial]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const { column, direction } = sortDescriptor;
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      // Helper to handle null/undefined dates for sorting
      const getDateValue = (dateStr?: string | null): number => {
        return dateStr ? new Date(dateStr).getTime() : 0;
      };

      switch (column) {
        case 'email':
          valA = a.user.email || '';
          valB = b.user.email || '';
          break;
        case 'created_at':
          valA = getDateValue(a.user.created_at);
          valB = getDateValue(b.user.created_at);
          break;
        case 'last_sign_in_at':
          valA = getDateValue(a.user.last_sign_in_at);
          valB = getDateValue(b.user.last_sign_in_at);
          break;
        case 'name':
          valA = `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`.trim().toLowerCase();
          valB = `${b.profile?.first_name || ''} ${b.profile?.last_name || ''}`.trim().toLowerCase();
          break;
        case 'subscription_plan':
          valA = a.subscription?.subscription_plan || '';
          valB = b.subscription?.subscription_plan || '';
          break;
        case 'location':
          valA = a.profile?.location || '';
          valB = b.profile?.location || '';
          break;
        case 'work_experience_count':
          valA = a.profile?.work_experience?.length || 0;
          valB = b.profile?.work_experience?.length || 0;
          break;
        case 'education_count':
          valA = a.profile?.education?.length || 0;
          valB = b.profile?.education?.length || 0;
          break;
        case 'skills_count':
          valA = a.profile?.skills?.length || 0;
          valB = b.profile?.skills?.length || 0;
          break;
        case 'subscription_status':
          valA = a.subscription?.subscription_status || '';
          valB = b.subscription?.subscription_status || '';
          break;
        case 'current_period_end':
          valA = getDateValue(a.subscription?.current_period_end);
          valB = getDateValue(b.subscription?.current_period_end);
          break;
        case 'trial_end':
          valA = getDateValue(a.subscription?.trial_end);
          valB = getDateValue(b.subscription?.trial_end);
          break;
        case 'resume_count':
          valA = a.resume_count || 0;
          valB = b.resume_count || 0;
          break;
        default:
          // Should not happen if all SortableColumns are handled
          console.warn(`Unhandled sort column: ${column}`);
          return 0;
      }

      const comparison = valA < valB ? -1 : valA > valB ? 1 : 0;
      return direction === 'ascending' ? comparison : -comparison;
    });
  }, [filteredUsers, sortDescriptor]);

  // Moved uniquePlans and uniqueStatuses calculation above these checks

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline" 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by plan" />
            </SelectTrigger>
            <SelectContent>
              {uniquePlans.map(plan => (
                <SelectItem key={plan} value={plan}>
                  {plan === 'all' ? 'All Plans' : plan === 'none' ? 'No Plan' : plan.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTrial} onValueChange={(value) => setFilterTrial(value as typeof filterTrial)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Filter by trial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trial States</SelectItem>
              <SelectItem value="active">Active Trial</SelectItem>
              <SelectItem value="ended">Trial Ended</SelectItem>
              <SelectItem value="none">Never Started Trial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status === 'none' ? 'N/A' : status.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Tabs defaultValue="overview" className="w-full">
        <div className="px-4">
          {/* Updated grid columns and removed Subscriptions trigger */}
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview & Subscriptions</TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
          </TabsList>
        </div>

        <UsersOverviewTable
          users={sortedUsers}
          totalUsers={users.length}
          filtered={filterPlan !== 'all' || filterStatus !== 'all' || filterTrial !== 'all' || Boolean(searchTerm)}
          sortDescriptor={sortDescriptor}
          onSort={handleSort}
          onSelectUser={(userId) => router.push(`/admin/${userId}`)}
        />
        <UsersProfilesTable
          users={sortedUsers}
          totalUsers={users.length}
          filtered={filterPlan !== 'all' || filterStatus !== 'all' || filterTrial !== 'all' || Boolean(searchTerm)}
          sortDescriptor={sortDescriptor}
          onSort={handleSort}
          onSelectUser={(userId) => router.push(`/admin/${userId}`)}
        />

        {/* Removed TabsContent for "subscriptions" */}
      </Tabs>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      ))}
    </Card>
  );
}
