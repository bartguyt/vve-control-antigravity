-- 1. Activity Logs Table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vve_id UUID REFERENCES public.vves(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'login'
    target_type TEXT NOT NULL, -- 'member', 'document', 'event'
    target_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities in their VvE"
    ON public.activity_logs FOR SELECT
    USING (vve_id = get_my_vve_id());

-- 2. Documents Table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vve_id UUID REFERENCES public.vves(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their VvE"
    ON public.documents FOR SELECT
    USING (vve_id = get_my_vve_id());

CREATE POLICY "Admins can manage documents"
    ON public.documents FOR ALL
    USING (vve_id = get_my_vve_id() AND get_my_role() = 'admin');

-- 3. Agenda & Categories
CREATE TABLE public.event_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vve_id UUID REFERENCES public.vves(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vve_id, name)
);

ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories in their VvE"
    ON public.event_categories FOR SELECT
    USING (vve_id = get_my_vve_id());

CREATE POLICY "Users can create categories in their VvE"
    ON public.event_categories FOR INSERT
    WITH CHECK (vve_id = get_my_vve_id());

CREATE TABLE public.agenda_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vve_id UUID REFERENCES public.vves(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.event_categories(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    location TEXT,
    image_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for agenda_events
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their VvE"
    ON public.agenda_events FOR SELECT
    USING (vve_id = get_my_vve_id());

CREATE POLICY "All members can create events"
    ON public.agenda_events FOR INSERT
    WITH CHECK (vve_id = get_my_vve_id());

CREATE POLICY "Users can manage their own events or Admins manage all"
    ON public.agenda_events FOR ALL
    USING (
        vve_id = get_my_vve_id() AND (
            created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
            get_my_role() = 'admin'
        )
    );
