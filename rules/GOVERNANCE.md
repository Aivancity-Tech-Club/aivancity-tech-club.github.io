# How the rules change

`rules/rules.yaml` is the **official rulebook** of the aivancity Tech Club and GDG on Campus aivancity.
The website and the points platform read it directly, so **if a rule is not in that file, it does not exist.**

## Changing a rule

1. Anyone in the club can propose a change by opening a **pull request** that edits `rules/rules.yaml`.
2. The pull request must explain **what** changes and **why**.
3. It needs **approval from an organizer** before it can be merged.
4. Bump `version` in the file:
   - patch (1.0.**1**): wording or typo fixes, no effect on points
   - minor (1.**1**.0): new rules, badges or seasons
   - major (**2**.0.0): changed point values or rank requirements
5. Changes take effect **as soon as they are merged**: points and bandanas are recomputed from the rulebook on every page, so everyone sees the new result right away.

## Guarantees

- No change can take away points or a bandana someone has already earned.
- The full history of the rules is the Git history of this file. Anyone can see who changed what, and when.
