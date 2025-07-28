import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient'; // your supabase instance

// Preload SearchView in the background
import SearchView from '@/views/SearchView.vue';
import ExploreView from '@/views/ExploreView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
    children: [
      { path: '', redirect: '/search' },
      { path: 'search', component: SearchView },
      { path: 'explore', component: ExploreView },
      { path: 'add', component: () => import('@/views/AddProductView.vue'), meta: { requiresAuth: true } },
      { path: 'profile', component: () => import('@/views/ProfileView.vue') },
    ],
  },
  {
    path: '/report/:barcode',
    component: () => import('@/views/ReportView.vue'),
    meta: { requiresAuth: true } // 👈 Add this flag
  },
  { path: '/settings', component: () => import('@/views/SettingsView.vue') },
  { path: '/legal', component: () => import('@/views/LegalView.vue') },
  { path: '/login', component: () => import('@/views/LoginView.vue') },
];


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to, from, next) => {
  const publicPages = ['/login', '/signup', '/search', '/explore', '/profile', '/settings', '/legal'];

  const isPublic = publicPages.includes(to.path);
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
      return next('/search');
    }
  }

  next(); // ✅ Allow access
});




export default router;
