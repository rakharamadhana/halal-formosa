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
  // router/index.ts
  {
    path: '/news/:id',
    name: 'news-view',
    component: () => import('@/views/news/NewsView.vue'),
    props: true
  },
  {
    path: '/report/:barcode',
    component: () => import('@/views/search/ReportView.vue'),
    meta: { requiresAuth: true } // 👈 Add this flag
  },
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
    '/home'
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
