# Jeux de Murist 2025

Application web pour la gestion des jeux de jeunesse du Giron de Murist 2025.

## Fonctionnalités

- **Gestion des jeunesses** : Création et gestion des groupes de jeunesse
- **Gestion des jeux** : Configuration des jeux avec images et descriptions
- **Planification** : Génération automatique d'horaires équilibrés
- **Scores** : Saisie et affichage des scores par créneau
- **Classements** : Affichage des classements en temps réel
- **Paramètres d'affichage** : Contrôle de la visibilité des scores pour les utilisateurs publics

## Paramètres d'affichage

L'application permet aux administrateurs de contrôler la visibilité des scores et classements pour les utilisateurs publics :

- **Afficher les scores publiquement** : Quand activé, tous les utilisateurs peuvent voir les scores et classements
- **Masquer les scores** : Quand désactivé, seuls les administrateurs peuvent voir les scores et classements

### Configuration

1. Connectez-vous en tant qu'administrateur
2. Accédez à la page de gestion des scores (`/admin/creneaux`)
3. Utilisez le panneau "Paramètres" pour contrôler la visibilité

### Variables d'environnement

```env
SHOW_SCORES_PUBLICLY=true  # Valeur par défaut (true = visible, false = caché)
```

## Installation

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Configuration

### Image Management

This project uses URL-based image management. Simply provide image URLs from external sources when adding images to games.

### Analytics

This project only tracks usage of the share button ("share_clicked" event) for games and teams.

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
