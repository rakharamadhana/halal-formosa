import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient'; // your supabase instance

// Preload SearchView in the background
import SearchView from '@/views/SearchView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
    children: [
      { path: '', redirect: '/search' },
      { path: 'search', component: SearchView },
      { path: 'add', component: () => import('@/views/AddProductView.vue') },
      { path: 'profile', component: () => import('@/views/ProfileView.vue') },
    ],
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
  // Public routes accessible without login
  const publicPages = ['/login', '/signup', '/search', '/profile'];

  // If route is public, always allow access
  if (publicPages.includes(to.path)) {
    return next();
  }

  // For protected routes, check session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Not logged in, redirect to login page
    return next('/login');
  }

  // Now check if route requires admin role
  if (to.meta.requiresAdmin) {
    try {
      const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

      if (error || !data) {
        console.error('Failed to fetch user role:', error);
        return next('/login'); // or unauthorized page
      }

      if (data.role !== 'admin') {
        // Not admin: redirect to search or unauthorized page
        return next('/search');
      }
    } catch (err) {
      console.error('Error during role check:', err);
      return next('/login');
    }
  }

  // All other cases, allow access
  next();
});



export default router;
