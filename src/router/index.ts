import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient'; // your supabase instance

// Preload SearchView in the background
import SearchView from '@/views/search/SearchView.vue';
import ExploreView from '@/views/explore/ExploreView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/views/MainView.vue'),
    children: [
      { path: '', redirect: '/home' },
      { path: 'home', component: () => import('@/views/home/HomeView.vue') },
      { path: 'search', component: SearchView },
      { path: 'explore', component: ExploreView },
      { path: 'add', component: () => import('@/views/add-product/AddProductView.vue'), meta: { requiresAuth: true } },
      { path: 'profile', component: () => import('@/views/profile/ProfileView.vue') },
    ],
  },
    { path: '/news', component: () => import('@/views/news/NewsView.vue') },
    { path: '/news/:id', name: 'news-detail', component: () => import('@/views/news/NewsDetailView.vue'), props: true },
    {
        path: '/news/add',
        component: () => import('@/views/news/AddNewsView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/news/edit/:id',
        component: () => import('@/views/news/AddNewsView.vue'), // same as "Add" view
    },
    { path: '/report/:barcode', component: () => import('@/views/search/ReportView.vue'), meta: { requiresAuth: true } },
    { path: '/settings', component: () => import('@/views/profile/SettingsView.vue') },
    { path: '/legal', component: () => import('@/views/legal/LegalView.vue') },
    { path: '/signup', component: () => import('@/views/auth/SignUpView.vue') },
    { path: '/login', component: () => import('@/views/auth/LoginView.vue') },
];


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to, from, next) => {
  const publicPages = [
    '/login',
    '/signup',
    '/search',
    '/explore',
    '/profile',
    '/settings',
    '/legal',
    '/home',
      '/news'
  ];

  // ✅ Mark public paths
  const isPublic =
      publicPages.includes(to.path) ||
      to.path.startsWith('/news/'); // ✅ dynamic news pages are public

  const requiresAuth = to.meta.requiresAuth || !isPublic;

  const { data: { session } } = await supabase.auth.getSession();

  if (requiresAuth && !session) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }

  if (to.meta.requiresAdmin) {
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session?.user.id)
        .single();

    if (error || !data || data.role !== 'admin') {
      return next('/home');
    }
  }

  next();
});

export default router;
