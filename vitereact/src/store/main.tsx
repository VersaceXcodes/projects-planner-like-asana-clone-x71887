import { configureStore, combineReducers, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// ----------------------
// Types
// ----------------------
interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  notify_in_app: boolean;
  created_at: string;
  updated_at: string;
}
interface Workspace {
  id: string;
  name: string;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}
interface NotificationCount {
  unread_count: number;
}
interface SearchSuggestions {
  projects: Array<{ id: string; name: string; color: string }>;
  tasks: Array<{ id: string; title: string; project_id: string }>;
}
interface SearchState {
  query: string;
  suggestions: SearchSuggestions;
  loading: boolean;
}
interface WebsocketState {
  connected: boolean;
  rooms: string[];
}

// ----------------------
// Axios default config
// ----------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
axios.defaults.baseURL = API_BASE_URL;

// ----------------------
// Auth slice
// ----------------------
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    is_authenticated: false,
    token: null as string | null,
    user: null as User | null
  },
  reducers: {
    set_auth(state, action: PayloadAction<{ token: string; user: User }>) {
      state.is_authenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
    },
    clear_auth(state) {
      state.is_authenticated = false;
      state.token = null;
      state.user = null;
      delete axios.defaults.headers.common['Authorization'];
    }
  }
});

// ----------------------
// Workspaces slice
// ----------------------
const workspacesSlice = createSlice({
  name: 'workspaces',
  initialState: { list: [] as Workspace[] },
  reducers: {
    set_workspaces(state, action: PayloadAction<Workspace[]>) {
      state.list = action.payload;
    },
    add_workspace(state, action: PayloadAction<Workspace>) {
      state.list.push(action.payload);
    },
    update_workspace(state, action: PayloadAction<Workspace>) {
      const idx = state.list.findIndex(w => w.id === action.payload.id);
      if (idx >= 0) state.list[idx] = action.payload;
    },
    remove_workspace(state, action: PayloadAction<string>) {
      state.list = state.list.filter(w => w.id !== action.payload);
    }
  }
});

// ----------------------
// Current workspace slice
// ----------------------
const currentWorkspaceSlice = createSlice({
  name: 'current_workspace_id',
  initialState: null as string | null,
  reducers: {
    set_current_workspace_id(_, action: PayloadAction<string | null>) {
      return action.payload;
    }
  }
});

// ----------------------
// Notifications slice
// ----------------------
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { unread_count: 0 } as NotificationCount,
  reducers: {
    set_unread_count(state, action: PayloadAction<number>) {
      state.unread_count = action.payload;
    },
    increment_unread(state) {
      state.unread_count += 1;
    },
    decrement_unread(state) {
      state.unread_count = Math.max(0, state.unread_count - 1);
    }
  }
});

// ----------------------
// Search slice
// ----------------------
const initialSearch: SearchState = {
  query: '',
  suggestions: { projects: [], tasks: [] },
  loading: false
};
const searchSlice = createSlice({
  name: 'search',
  initialState: initialSearch,
  reducers: {
    set_search_query(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    set_search_loading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    set_search_suggestions(state, action: PayloadAction<SearchSuggestions>) {
      state.suggestions = action.payload;
      state.loading = false;
    },
    clear_search_suggestions(state) {
      state.suggestions = { projects: [], tasks: [] };
      state.loading = false;
    }
  }
});

// ----------------------
// Websocket slice
// ----------------------
const websocketSlice = createSlice({
  name: 'websocket',
  initialState: { connected: false, rooms: [] } as WebsocketState,
  reducers: {
    set_ws_connected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },
    set_ws_rooms(state, action: PayloadAction<string[]>) {
      state.rooms = action.payload;
    },
    add_ws_room(state, action: PayloadAction<string>) {
      if (!state.rooms.includes(action.payload)) {
        state.rooms.push(action.payload);
      }
    },
    remove_ws_room(state, action: PayloadAction<string>) {
      state.rooms = state.rooms.filter(r => r !== action.payload);
    }
  }
});

// ----------------------
// Thunks
// ----------------------
export const fetch_workspaces = createAsyncThunk('workspaces/fetch', async (_, thunk) => {
  const resp = await axios.get<Workspace[]>('/api/workspaces');
  thunk.dispatch(workspacesSlice.actions.set_workspaces(resp.data));
});

export const fetch_unread_count = createAsyncThunk('notifications/fetch_unread_count', async (_, thunk) => {
  const resp = await axios.get<{ unread_count: number }>('/api/notifications/inbox_count');
  thunk.dispatch(notificationsSlice.actions.set_unread_count(resp.data.unread_count));
});

export const fetch_search_suggestions = createAsyncThunk(
  'search/fetch_search_suggestions',
  async (query: string, thunk) => {
    thunk.dispatch(searchSlice.actions.set_search_loading(true));
    const resp = await axios.get<{ projects: any[]; tasks: any[] }>('/api/search', { params: { query } });
    const mapped: SearchSuggestions = {
      projects: resp.data.projects.map(p => ({ id: p.id, name: p.name, color: p.color })),
      tasks: resp.data.tasks.map(t => ({ id: t.id, title: t.title, project_id: t.project_id }))
    };
    thunk.dispatch(searchSlice.actions.set_search_suggestions(mapped));
  }
);

let socket: Socket | null = null;

export const init_socket = createAsyncThunk('websocket/init_socket', async (_, thunk) => {
  const state = thunk.getState() as any;
  const token = state.auth.token as string | null;
  const user = state.auth.user as User | null;
  if (!token || !user) return;
  // connect
  socket = io(API_BASE_URL, { auth: { token } });
  socket.on('connect', () => {
    thunk.dispatch(websocketSlice.actions.set_ws_connected(true));
    const rooms = [
      `user:${user.id}`,
      ...state.workspaces.list.map((ws: Workspace) => `workspace:${ws.id}`)
    ];
    thunk.dispatch(websocketSlice.actions.set_ws_rooms(rooms));
  });
  socket.on('disconnect', () => {
    thunk.dispatch(websocketSlice.actions.set_ws_connected(false));
  });
  // notification events
  socket.on('notification_created', () => {
    thunk.dispatch(notificationsSlice.actions.increment_unread());
  });
  socket.on('notification_updated', (payload: any) => {
    if (payload.all_read) {
      thunk.dispatch(notificationsSlice.actions.set_unread_count(0));
    } else if (payload.is_read) {
      thunk.dispatch(notificationsSlice.actions.decrement_unread());
    } else {
      thunk.dispatch(notificationsSlice.actions.increment_unread());
    }
  });
});

export const disconnect_socket = createAsyncThunk('websocket/disconnect_socket', async (_, thunk) => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  thunk.dispatch(websocketSlice.actions.set_ws_connected(false));
  thunk.dispatch(websocketSlice.actions.set_ws_rooms([]));
});

export const logout = createAsyncThunk('auth/logout', async (_, thunk) => {
  thunk.dispatch(authSlice.actions.clear_auth());
  await thunk.dispatch(disconnect_socket());
});

// ----------------------
// Persist config & store
// ----------------------
const rootReducer = combineReducers({
  auth: authSlice.reducer,
  workspaces: workspacesSlice.reducer,
  current_workspace_id: currentWorkspaceSlice.reducer,
  notifications: notificationsSlice.reducer,
  search: searchSlice.reducer,
  websocket: websocketSlice.reducer
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'workspaces', 'current_workspace_id', 'notifications']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    })
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const {
  set_auth,
  clear_auth
} = authSlice.actions;
export const {
  set_workspaces,
  add_workspace,
  update_workspace,
  remove_workspace
} = workspacesSlice.actions;
export const { set_current_workspace_id } = currentWorkspaceSlice.actions;
export const {
  set_unread_count,
  increment_unread,
  decrement_unread
} = notificationsSlice.actions;
export const {
  set_search_query,
  set_search_loading,
  set_search_suggestions,
  clear_search_suggestions
} = searchSlice.actions;
export const {
  set_ws_connected,
  set_ws_rooms,
  add_ws_room,
  remove_ws_room
} = websocketSlice.actions;

export default store;