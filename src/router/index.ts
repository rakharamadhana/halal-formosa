import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient';

// Preload SearchView in the background
import SearchView from '@/views/search/SearchView.vue';
import ExploreView from '@/views/explore/ExploreView.vue';
import ScanIngredientsView from '@/views/scan/ScanIngredientsView.vue';
import { isAdmin, isContributor } from '@/composables/userProfile'

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
    { path: '/scan', component: ScanIngredientsView, meta: { requiresAuth: true, noAds: true } },
    { path: '/news/:id', name: 'news-detail', component: () => import('@/views/news/NewsDetailView.vue'), props: true, meta: { adSpaceId: 'ad-space-news-detail', adId: import.meta.env.VITE_ADMOB_NEWS_BANNER_ID } },
    { path: '/news/add', component: () => import('@/views/news/AddNewsView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/news/edit/:id', component: () => import('@/views/news/AddNewsView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/explore/add', name: 'ExploreAdd', component: () => import('@/views/explore/AddPlaceView.vue'), meta: { requiresAuth: true } },
    { path: '/report/:barcode', name: 'report', component: () => import('@/views/search/ReportView.vue'), meta: { requiresAuth: true }, props: true },
    { path: '/settings', component: () => import('@/views/profile/SettingsView.vue') },
    { path: '/legal', component: () => import('@/views/legal/LegalView.vue') },
    { path: '/credits', component: () => import('@/views/profile/CreditsView.vue') },
    { path: '/signup', component: () => import('@/views/auth/SignUpView.vue') },
    { path: '/login', component: () => import('@/views/auth/LoginView.vue') },
    {
        path: '/admin/review-products',
        component: () => import('@/views/admin/ReviewProductsView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    }
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
});

// ✅ Cleaner guard
router.beforeEach(async (to, from, next) => {

    const { data: { session } } = await supabase.auth.getSession()

    // 🚫 Needs auth but not logged in
    if (to.meta.requiresAuth && !session) {
        return next({
            path: '/login',
            query: { redirect: to.fullPath }
        })
    }

    // 🔐 Admin/Contributor-only routes
    if (to.meta.requiresAdmin && !(isAdmin.value || isContributor.value)) {
        return next('/home')
    }

    next();
});

export default router;
