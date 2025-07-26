import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient'; // your supabase instance

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
    children: [
      { path: '', redirect: '/search' },
      { path: 'search', component: () => import('@/views/SearchView.vue') },
      { path: 'add', component: () => import('@/views/AddProductView.vue'), meta: { requiresAuth: true } },
      { path: 'profile', component: () => import('@/views/ProfileView.vue') },
    ],
  },
  { path: '/login', component: () => import('@/views/LoginView.vue') },
  { path: '/signup', component: () => import('@/views/SignUpView.vue') },
];


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to, from, next) => {
  const publicPages = ['/login', '/signup', '/search', '/profile']
  const authRequired = !publicPages.includes(to.path)

  const { data: { session } } = await supabase.auth.getSession()

  if (authRequired && !session) {
    return next('/login')
  }
  next()
});

export default router;
