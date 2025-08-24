import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient';

// Preload SearchView in the background
import SearchView from '@/views/search/SearchView.vue';
import ExploreView from '@/views/explore/ExploreView.vue';
import ScanIngredientsView from '@/views/scan/ScanIngredientsView.vue';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        component: () => import('@/views/MainView.vue'),
        children: [
            { path: '', redirect: '/home' },
            { path: 'home', component: () => import('@/views/home/HomeView.vue') },
            { path: 'search', component: SearchView, meta: { adSpaceId: 'ad-space-search', adId: import.meta.env.VITE_ADMOB_SEARCH_BANNER_ID } },
            { path: 'explore', component: ExploreView, meta: { adSpaceId: 'ad-space-explore', adId: import.meta.env.VITE_ADMOB_EXPLORE_BANNER_ID } },
            { path: 'news', component: () => import('@/views/news/NewsView.vue'), meta: { noAds: true } },
            { path: 'add', component: () => import('@/views/add-product/AddProductView.vue'), meta: { requiresAuth: true } },
            { path: 'profile', component: () => import('@/views/profile/ProfileView.vue'), meta: { noAds: true } },
        ],
    },
    { path: '/item/:barcode', name: 'item-details', component: () => import('@/views/search/ItemDetailsView.vue'), meta: { noAds: true } },
    { path: '/scan', component: ScanIngredientsView, meta: { noAds: true } },
    { path: '/news/:id', name: 'news-detail', component: () => import('@/views/news/NewsDetailView.vue'), props: true, meta: { adSpaceId: 'ad-space-news-detail', adId: import.meta.env.VITE_ADMOB_NEWS_BANNER_ID } },
    { path: '/news/add', component: () => import('@/views/news/AddNewsView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/news/edit/:id', component: () => import('@/views/news/AddNewsView.vue') },
    { path: '/explore/add', name: 'ExploreAdd', component: () => import('@/views/explore/AddPlaceView.vue') },
    { path: '/report/:barcode', name: 'report', component: () => import('@/views/search/ReportView.vue'), meta: { requiresAuth: true }, props: true },
    { path: '/settings', component: () => import('@/views/profile/SettingsView.vue') },
    { path: '/legal', component: () => import('@/views/legal/LegalView.vue') },
    { path: '/credits', component: () => import('@/views/profile/CreditsView.vue') },
    { path: '/signup', component: () => import('@/views/auth/SignUpView.vue') },
    { path: '/login', component: () => import('@/views/auth/LoginView.vue') },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
});

// ✅ Cleaner guard
router.beforeEach(async (to, from, next) => {
    const publicRoutes = new Set([
        '/login',
        '/signup',
        '/search',
        '/explore',
        '/profile',
        '/settings',
        '/legal',
        '/credits',
        '/home',
        '/news'
    ]);

    const isPublic =
        publicRoutes.has(to.path) ||
        to.path.startsWith('/news/') || // dynamic news pages
        to.name === 'item-details';     // named route

    const { data: { session } } = await supabase.auth.getSession();

    // 🚫 Auth required but not logged in → redirect to login with redirect param
    if (!isPublic && !session) {
        return next({
            path: '/login',
            query: { redirect: to.fullPath }
        });
    }

    // 🔐 Admin check only when meta.requiresAdmin is true
    if (to.meta.requiresAdmin) {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session?.user.id)
            .maybeSingle();

        if (error || !data || data.role !== 'admin') {
            return next('/home');
        }
    }

    next();
});

export default router;
