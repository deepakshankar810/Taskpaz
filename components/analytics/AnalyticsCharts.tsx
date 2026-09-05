import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Brain, Target, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ProductivityHeatmap } from './ProductivityHeatmap';
import { MoodProductivityCorrelation } from './MoodProductivityCorrelation';
import { FinancialForecasting } from './FinancialForecasting';
import { SymphonyInsights } from './SymphonyInsights';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
const PRIORITY_COLORS = {
    high: '#ef4444',
    medium: '#eab308',
    low: '#3b82f6',
    urgent: '#7c3aed'
};

interface AnalyticsChartsProps {
    tasks?: any[];
    journalEntries?: any[];
    taskTrendData: any[];
    priorityData: any[];
    categoryData: any[];
    financialTrendData: any[];
    categoryChartData: any[];
    topCategories: any[];
    completionRate: number;
    currency: string;
    heatmapData: any[];
    moodCorrelationData: any[];
    financialForecastProps: { currentBalance: number; monthlyTrend: number; currency: string };
}

export default function AnalyticsCharts({
    tasks = [],
    journalEntries = [],
    taskTrendData,
    priorityData,
    categoryData,
    financialTrendData,
    categoryChartData,
    topCategories,
    completionRate,
    currency,
    heatmapData,
    moodCorrelationData,
    financialForecastProps
}: AnalyticsChartsProps) {

    const formatCurrency = (val: number) => {
        const prefix = currency.length > 1 ? `${currency} ` : currency;
        return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-10">
            {/* Symphony Insights AI Coaching & Correlation Engine */}
            <SymphonyInsights tasks={tasks} journalEntries={journalEntries} />

            {/* Top Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Efficiency Rate</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completionRate}%</div>
                        <p className="text-xs text-slate-500">of total tasks completed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Outlook</CardTitle>
                        <Target className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{financialForecastProps.monthlyTrend >= 0 ? '+' : ''}{formatCurrency(financialForecastProps.monthlyTrend)}</div>
                        <p className="text-xs text-slate-500">avg. monthly savings</p>
                    </CardContent>
                </Card>
            </div>

            {/* Productivity Heatmap */}
            <ProductivityHeatmap data={heatmapData} />

            {/* Row 1: Task Trends & Priority */}
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Task Completion (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={taskTrendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#888888' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={4}
                                />
                                <YAxis tick={{ fontSize: 12, fill: '#888888' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="completed" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <MoodProductivityCorrelation data={moodCorrelationData} />
            </div>

            {/* Row 2: Tasks vs Financial Overview */}
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Task Priority Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full mt-4">
                        {priorityData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400">No tasks found</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={priorityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {priorityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <FinancialForecasting {...financialForecastProps} />
            </div>

            <div className="flex flex-col pt-6 border-t">
                <h2 className="text-xl font-bold">Financial Insights</h2>
                <p className="text-sm text-slate-500">Historical trends and breakdown of your finances</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Cash Flow Trend (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={financialTrendData}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 12}}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 12}}
                                tickFormatter={(val) => `${currency}${val}`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => formatCurrency(Number(value))}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" height={36} />
                            <Area 
                                type="monotone" 
                                dataKey="income" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorIncome)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="expense" 
                                stroke="#ef4444" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorExpense)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {categoryChartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 font-medium">No expense data to display</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryChartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => formatCurrency(Number(value))}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Spending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topCategories.length === 0 ? (
                                <p className="text-slate-400 text-sm">Add expenses to see insights</p>
                            ) : (
                                topCategories.map((cat, i) => (
                                    <div key={cat.name} className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="font-medium truncate text-sm">
                                                {cat.name} {cat.purpose && <span className="text-xs text-slate-400 font-normal">({cat.purpose})</span>}
                                            </span>
                                        </div>
                                        <span className="text-sm text-slate-500 whitespace-nowrap flex-shrink-0">{formatCurrency(cat.value)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
