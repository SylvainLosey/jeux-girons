import { track } from "@vercel/analytics";

export const analytics = {
  // Track team page views
  trackTeamView: (teamSlug: string) => {
    track("team_view", {
      team_slug: teamSlug,
      page_type: "team",
    });
  },

  // Track game page views
  trackGameView: (gameSlug: string) => {
    track("game_view", {
      game_slug: gameSlug,
      page_type: "game",
    });
  },

  // Track rankings page views
  trackRankingsView: () => {
    track("rankings_view", {
      page_type: "rankings",
    });
  },

  // Track general page views (fallback)
  trackPageView: (pageName: string, properties?: Record<string, string | number | boolean>) => {
    track("page_view", {
      page_name: pageName,
      ...properties,
    });
  },

  // Track user interactions
  trackInteraction: (action: string, properties?: Record<string, string | number | boolean>) => {
    track("user_interaction", {
      action,
      ...properties,
    });
  },
}; 