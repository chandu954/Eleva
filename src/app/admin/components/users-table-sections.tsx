'use client';

import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SortDescriptor } from '@/lib/types';
import { formatDate, getTrialMeta, type SortableColumns, type UserData } from './user-table-types';

type TableProps = {
  users: UserData[];
  totalUsers: number;
  filtered: boolean;
  sortDescriptor: SortDescriptor<SortableColumns>;
  onSort: (column: SortableColumns) => void;
  onSelectUser: (userId: string) => void;
};

function renderSortIcon(column: SortableColumns, descriptor: SortDescriptor<SortableColumns>) {
  if (descriptor.column !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
  return descriptor.direction === 'ascending'
    ? <ArrowUpDown className="ml-2 h-4 w-4 transform rotate-180" />
    : <ArrowUpDown className="ml-2 h-4 w-4" />;
}

function renderTrialBadge(trialEnd?: string | null) {
  const trialMeta = getTrialMeta(trialEnd);
  if (!trialMeta.hasTrial) return <Badge variant="outline">No Trial</Badge>;
  return <Badge className={trialMeta.isTrialing ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}>{trialMeta.isTrialing ? `Trialing · ends ${trialMeta.displayDate}` : `Trial ended ${trialMeta.displayDate}`}</Badge>;
}

export function UsersOverviewTable({ users, totalUsers, filtered, sortDescriptor, onSort, onSelectUser }: TableProps) {
  return (
        <TabsContent value="overview" className="p-0">
          <div className="rounded-md border-t">
            <Table>
              <TableCaption>
                {`Showing ${users.length} of ${totalUsers} users.`}
                { filtered &&
                  ` (Filtered from ${totalUsers} total)`
                }
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('email')} className="px-0 hover:bg-transparent">
                      Email {renderSortIcon('email', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('created_at')} className="px-0 hover:bg-transparent">
                      Created {renderSortIcon('created_at', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('last_sign_in_at')} className="px-0 hover:bg-transparent">
                      Last Sign In {renderSortIcon('last_sign_in_at', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('name')} className="px-0 hover:bg-transparent">
                      Name {renderSortIcon('name', sortDescriptor)}
                    </Button>
                  </TableHead>
                  {/* Moved Subscription columns here */}
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('subscription_plan')} className="px-0 hover:bg-transparent">
                      Plan {renderSortIcon('subscription_plan', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('trial_end')} className="px-0 hover:bg-transparent">
                      Trial {renderSortIcon('trial_end', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('subscription_status')} className="px-0 hover:bg-transparent">
                      Status {renderSortIcon('subscription_status', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('current_period_end')} className="px-0 hover:bg-transparent">
                      Expires {renderSortIcon('current_period_end', sortDescriptor)}
                    </Button>
                  </TableHead>
                  {/* Added Resume Count column */}
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('resume_count')} className="px-0 hover:bg-transparent">
                      Resumes {renderSortIcon('resume_count', sortDescriptor)}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => {
                  return (
                    <TableRow
                      key={item.user.id}
                      onClick={() => onSelectUser(item.user.id)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{item.user.email || 'N/A'}</TableCell>
                      <TableCell>{formatDate(item.user.created_at)}</TableCell>
                      <TableCell>{formatDate(item.user.last_sign_in_at)}</TableCell>
                      <TableCell>
                        {item.profile?.first_name && item.profile?.last_name
                          ? `${item.profile.first_name} ${item.profile.last_name}`
                          : 'Not set'}
                      </TableCell>
                      {/* Moved Subscription cells here */}
                      <TableCell>
                        {item.subscription?.subscription_plan ? (
                          <Badge className={
                            item.subscription.subscription_plan === 'pro'
                              ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }>
                            {item.subscription.subscription_plan.toUpperCase()}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Plan</Badge>
                        )}
                      </TableCell>
                      <TableCell>{renderTrialBadge(item.subscription?.trial_end ?? null)}</TableCell>
                      <TableCell>
                        {item.subscription?.subscription_status ? (
                          <Badge className={
                            item.subscription.subscription_status === 'active'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                          }>
                            {item.subscription.subscription_status.toUpperCase()}
                          </Badge>
                        ) : (
                          <Badge variant="outline">N/A</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(item.subscription?.current_period_end)}</TableCell>
                      {/* Added Resume Count cell */}
                      <TableCell className="text-center">{item.resume_count}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

  );
}

export function UsersProfilesTable({ users, totalUsers, filtered, sortDescriptor, onSort, onSelectUser }: TableProps) {
  return (
        <TabsContent value="profiles" className="p-0">
          <div className="rounded-md border-t">
            <Table>
               <TableCaption>
                 {`Showing ${users.filter(u => u.profile).length} profiles from ${users.length} filtered users.`}
                 { filtered &&
                  ` (Filtered from ${totalUsers} total)`
                 }
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('email')} className="px-0 hover:bg-transparent">
                      Email {renderSortIcon('email', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('name')} className="px-0 hover:bg-transparent">
                      Name {renderSortIcon('name', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('trial_end')} className="px-0 hover:bg-transparent">
                      Trial {renderSortIcon('trial_end', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('location')} className="px-0 hover:bg-transparent">
                      Location {renderSortIcon('location', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('work_experience_count')} className="px-0 hover:bg-transparent">
                      Work Exp {renderSortIcon('work_experience_count', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => onSort('education_count')} className="px-0 hover:bg-transparent">
                      Education {renderSortIcon('education_count', sortDescriptor)}
                    </Button>
                  </TableHead>
                  <TableHead>
                     <Button variant="ghost" onClick={() => onSort('skills_count')} className="px-0 hover:bg-transparent">
                      Skills {renderSortIcon('skills_count', sortDescriptor)}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => {
                  return (
                    <TableRow
                      key={item.user.id}
                      onClick={() => onSelectUser(item.user.id)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{item.user.email || 'N/A'}</TableCell>
                      <TableCell>
                        {item.profile?.first_name && item.profile?.last_name
                          ? `${item.profile.first_name} ${item.profile.last_name}`
                          : 'Not set'}
                      </TableCell>
                      <TableCell>{renderTrialBadge(item.subscription?.trial_end ?? null)}</TableCell>
                      <TableCell>{item.profile?.location || 'Not set'}</TableCell>
                      <TableCell>
                        {item.profile?.work_experience && Array.isArray(item.profile.work_experience) ? (
                          <Badge variant="outline">{item.profile.work_experience.length} entries</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.profile?.education && Array.isArray(item.profile.education) ? (
                          <Badge variant="outline">{item.profile.education.length} entries</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.profile?.skills && Array.isArray(item.profile.skills) ? (
                          <Badge variant="outline">{item.profile.skills.length} entries</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

  );
}
