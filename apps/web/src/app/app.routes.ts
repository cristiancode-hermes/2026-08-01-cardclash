import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LayoutShell } from './layout/layout-shell/layout-shell';

export const routes: Routes = [
  {
    path: '',
    component: LayoutShell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage),
        title: 'Dashboard — CardClash'
      },
      {
        path: 'collection',
        loadComponent: () => import('./pages/collection/collection').then(m => m.CollectionPage),
        title: 'Collection — CardClash'
      },
      {
        path: 'decks',
        loadComponent: () => import('./pages/deck-list/deck-list').then(m => m.DeckListPage),
        title: 'Decks — CardClash'
      },
      {
        path: 'decks/:deckId',
        loadComponent: () => import('./pages/deck-builder/deck-builder').then(m => m.DeckBuilderPage),
        title: 'Deck Builder — CardClash'
      },
      {
        path: 'battle',
        loadComponent: () => import('./pages/battle-setup/battle-setup').then(m => m.BattleSetupPage),
        title: 'Battle — CardClash'
      },
      {
        path: 'battle/:battleId',
        loadComponent: () => import('./pages/battle-arena/battle-arena').then(m => m.BattleArenaPage),
        title: 'Arena — CardClash'
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/history/history').then(m => m.HistoryPage),
        title: 'Battle History — CardClash'
      },
      {
        path: 'shop',
        loadComponent: () => import('./pages/shop/shop').then(m => m.ShopPage),
        title: 'Shop — CardClash'
      },
      {
        path: 'leaderboard',
        loadComponent: () => import('./pages/leaderboard/leaderboard').then(m => m.LeaderboardPage),
        title: 'Leaderboard — CardClash'
      },
      {
        path: 'quests',
        loadComponent: () => import('./pages/quests/quests').then(m => m.QuestsPage),
        title: 'Quests — CardClash'
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsPage),
        title: 'Settings — CardClash'
      },
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginPage),
    title: 'Login — CardClash'
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterPage),
    title: 'Register — CardClash'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
