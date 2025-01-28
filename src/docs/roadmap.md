# Roadmap

## Chat Session Management

### Routing & Navigation
- [ ] Implement automatic redirect from `/` to `/session/new`
- [ ] Set up session routes (`/session`, `/session/new`, `/session/:id`)
- [ ] Add settings route (`/settings`)
- [ ] Implement session history in sidebar

### Chat Naming & Organization
- [ ] Implement automatic chat naming system
  - [ ] Immediate naming for sessions with initial prompts
  - [ ] Delayed naming after 3-5 messages for organic conversations
  - [ ] Use OpenAI to generate semantic titles
- [ ] Add manual chat renaming capability
  - [ ] Add edit button for titles
  - [ ] Store title history for reverting changes
- [ ] Create SessionStore for managing chat data
  - [ ] Implement CRUD operations for sessions
  - [ ] Set up Supabase integration for persistence
  - [ ] Add real-time updates for session changes

### UI/UX Improvements
- [ ] Add loading states for session transitions
- [ ] Implement smooth animations for title updates
- [ ] Add visual feedback for auto-naming process
- [ ] Create empty state for new sessions
- [ ] Add session search functionality