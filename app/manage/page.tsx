'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { 
  FileText, 
  MessageSquare, 
  Mail, 
  Tag, 
  TrendingUp, 
  Eye, 
  Heart,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

type Stats = {
  totalArticles: number;
  totalLikes: number;
  totalViews: number;
  totalComments: number;
  pendingComments: number;
  unreadMessages: number;
  topArticles: Array<{
    id: string;
    title: string;
    views_count: number;
    likes_count: number;
  }>;
};

export default function ManagePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // Total articles
      const { count: totalArticles } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });

      // Total likes
      const { data: articles } = await supabase
        .from('articles')
        .select('likes_count, views_count');
      
      const totalLikes = articles?.reduce((sum, a) => sum + (a.likes_count || 0), 0) || 0;
      const totalViews = articles?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;

      // Total comments
      const { count: totalComments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true });

      // Pending comments
      const { count: pendingComments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);

      // Unread messages
      const { count: unreadMessages } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      // Top articles
      const { data: topArticles } = await supabase
        .from('articles')
        .select('id, title, views_count, likes_count')
        .order('views_count', { ascending: false })
        .limit(5);

      setStats({
        totalArticles: totalArticles || 0,
        totalLikes,
        totalViews,
        totalComments: totalComments || 0,
        pendingComments: pendingComments || 0,
        unreadMessages: unreadMessages || 0,
        topArticles: topArticles || [],
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'סה"כ מאמרים', 
      value: stats?.totalArticles || 0, 
      icon: FileText, 
      color: 'bg-blue-500',
      link: '/manage/articles'
    },
    { 
      title: 'סה"כ צפיות', 
      value: stats?.totalViews || 0, 
      icon: Eye, 
      color: 'bg-green-500',
      link: null
    },
    { 
      title: 'סה"כ לייקים', 
      value: stats?.totalLikes || 0, 
      icon: Heart, 
      color: 'bg-pink-500',
      link: null
    },
    { 
      title: 'תגובות', 
      value: stats?.totalComments || 0, 
      icon: MessageSquare, 
      color: 'bg-purple-500',
      link: '/manage/comments',
      badge: stats?.pendingComments || 0
    },
  ];

  const alerts = [
    ...(stats?.pendingComments ? [{
      text: `${stats.pendingComments} תגובות ממתינות לאישור`,
      link: '/manage/comments',
      color: 'bg-amber-50 border-amber-200 text-amber-800'
    }] : []),
    ...(stats?.unreadMessages ? [{
      text: `${stats.unreadMessages} פניות חדשות`,
      link: '/manage/contacts',
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-stone-800">לוח בקרה</h1>
          <p className="text-stone-600 mt-1">ניהול אתר נירה גבאי</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {alerts.map((alert, i) => (
              <Link
                key={i}
                href={alert.link}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 ${alert.color} hover:shadow-md transition-shadow`}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 font-medium">{alert.text}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            const content = (
              <>
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-stone-600 text-sm mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-stone-800">{stat.value.toLocaleString()}</p>
                  </div>
                  {stat.badge ? (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {stat.badge}
                    </span>
                  ) : null}
                </div>
              </>
            );

            return stat.link ? (
              <Link
                key={i}
                href={stat.link}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-stone-100"
              >
                {content}
              </Link>
            ) : (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-stone-100">
                {content}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Articles */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              מאמרים מובילים
            </h2>
            <div className="space-y-3">
              {stats?.topArticles.map((article) => (
                <div key={article.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <Link 
                    href={`/articles/${article.id}`}
                    className="font-medium text-stone-800 hover:text-amber-600 transition-colors flex-1 truncate"
                  >
                    {article.title}
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-stone-600">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {article.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {article.likes_count || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-xl font-bold text-stone-800 mb-4">פעולות מהירות</h2>
            <div className="space-y-3">
              <Link
                href="/manage/articles/new"
                className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 rounded-lg border-2 border-amber-200 transition-colors group"
              >
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-stone-800">מאמר חדש</span>
                <ArrowRight className="w-5 h-5 mr-auto text-amber-600 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/manage/articles"
                className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 transition-colors group"
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-stone-800">ניהול מאמרים</span>
                <ArrowRight className="w-5 h-5 mr-auto text-blue-600 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/manage/comments"
                className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border-2 border-purple-200 transition-colors group"
              >
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-stone-800">אישור תגובות</span>
                {stats?.pendingComments ? (
                  <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {stats.pendingComments}
                  </span>
                ) : null}
                <ArrowRight className="w-5 h-5 mr-auto text-purple-600 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/manage/contacts"
                className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg border-2 border-green-200 transition-colors group"
              >
                <Mail className="w-5 h-5 text-green-600" />
                <span className="font-medium text-stone-800">פניות צור קשר</span>
                {stats?.unreadMessages ? (
                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {stats.unreadMessages}
                  </span>
                ) : null}
                <ArrowRight className="w-5 h-5 mr-auto text-green-600 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/manage/tags"
                className="flex items-center gap-3 p-4 bg-stone-50 hover:bg-stone-100 rounded-lg border-2 border-stone-200 transition-colors group"
              >
                <Tag className="w-5 h-5 text-stone-600" />
                <span className="font-medium text-stone-800">ניהול תגיות</span>
                <ArrowRight className="w-5 h-5 mr-auto text-stone-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
