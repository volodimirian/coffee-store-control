--
-- PostgreSQL database dump
--

\restrict ZJpIWuSJqref3520m8T96nPC0epZdc16XIYYPyvir6uuEw1TfvP9WA45Ekd5gxV

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO coffee_user;

--
-- Name: audit_trail; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.audit_trail (
    id integer NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id integer NOT NULL,
    action character varying(20) NOT NULL,
    old_value json,
    new_value json,
    user_id integer NOT NULL,
    business_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_trail OWNER TO coffee_user;

--
-- Name: audit_trail_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.audit_trail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_trail_id_seq OWNER TO coffee_user;

--
-- Name: audit_trail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.audit_trail_id_seq OWNED BY public.audit_trail.id;


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.businesses (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    city character varying(100),
    address text,
    owner_id integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    tech_card_requires_approval boolean DEFAULT false NOT NULL
);


ALTER TABLE public.businesses OWNER TO coffee_user;

--
-- Name: businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.businesses_id_seq OWNER TO coffee_user;

--
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    section_id integer NOT NULL,
    business_id integer NOT NULL,
    default_unit_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL
);


ALTER TABLE public.expense_categories OWNER TO coffee_user;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_categories_id_seq OWNER TO coffee_user;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: expense_records; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.expense_records (
    id integer NOT NULL,
    category_id integer NOT NULL,
    month_period_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    quantity_used numeric(10,3) NOT NULL,
    unit_id integer NOT NULL,
    invoice_item_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer
);


ALTER TABLE public.expense_records OWNER TO coffee_user;

--
-- Name: expense_records_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.expense_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_records_id_seq OWNER TO coffee_user;

--
-- Name: expense_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.expense_records_id_seq OWNED BY public.expense_records.id;


--
-- Name: expense_sections; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.expense_sections (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    business_id integer NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL
);


ALTER TABLE public.expense_sections OWNER TO coffee_user;

--
-- Name: expense_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.expense_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_sections_id_seq OWNER TO coffee_user;

--
-- Name: expense_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.expense_sections_id_seq OWNED BY public.expense_sections.id;


--
-- Name: ingredient_cost_history; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.ingredient_cost_history (
    id integer NOT NULL,
    category_id integer NOT NULL,
    business_id integer NOT NULL,
    invoice_id integer NOT NULL,
    invoice_item_id integer NOT NULL,
    cost_per_unit numeric(10,2) NOT NULL,
    unit_id integer NOT NULL,
    purchase_date date NOT NULL,
    quantity_purchased numeric(10,3) NOT NULL,
    total_cost numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ingredient_cost_history OWNER TO coffee_user;

--
-- Name: ingredient_cost_history_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.ingredient_cost_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingredient_cost_history_id_seq OWNER TO coffee_user;

--
-- Name: ingredient_cost_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.ingredient_cost_history_id_seq OWNED BY public.ingredient_cost_history.id;


--
-- Name: inventory_balances; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.inventory_balances (
    id integer NOT NULL,
    category_id integer NOT NULL,
    month_period_id integer NOT NULL,
    opening_balance numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    purchases_total numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    usage_total numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    closing_balance numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    unit_id integer NOT NULL,
    last_calculated timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.inventory_balances OWNER TO coffee_user;

--
-- Name: inventory_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.inventory_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_balances_id_seq OWNER TO coffee_user;

--
-- Name: inventory_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.inventory_balances_id_seq OWNED BY public.inventory_balances.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    category_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_id integer NOT NULL,
    unit_price numeric(12,4) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoice_items OWNER TO coffee_user;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_items_id_seq OWNER TO coffee_user;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    business_id integer NOT NULL,
    supplier_id integer NOT NULL,
    invoice_number character varying(100),
    invoice_date timestamp without time zone NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    paid_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    paid_date timestamp without time zone,
    document_path character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer
);


ALTER TABLE public.invoices OWNER TO coffee_user;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO coffee_user;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: month_periods; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.month_periods (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    business_id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.month_periods OWNER TO coffee_user;

--
-- Name: month_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.month_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.month_periods_id_seq OWNER TO coffee_user;

--
-- Name: month_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.month_periods_id_seq OWNED BY public.month_periods.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    resource character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.permissions OWNER TO coffee_user;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO coffee_user;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO coffee_user;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO coffee_user;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description character varying(255)
);


ALTER TABLE public.roles OWNER TO coffee_user;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO coffee_user;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: starting_inventory; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.starting_inventory (
    id integer NOT NULL,
    business_id integer NOT NULL,
    category_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_id integer NOT NULL,
    inventory_date date NOT NULL,
    created_by integer NOT NULL,
    notes character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.starting_inventory OWNER TO coffee_user;

--
-- Name: starting_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.starting_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.starting_inventory_id_seq OWNER TO coffee_user;

--
-- Name: starting_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.starting_inventory_id_seq OWNED BY public.starting_inventory.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    contact_info json,
    business_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    payment_terms_days integer DEFAULT 14 NOT NULL,
    tax_id character varying(50) NOT NULL
);


ALTER TABLE public.suppliers OWNER TO coffee_user;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO coffee_user;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: tech_card_item_ingredients; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.tech_card_item_ingredients (
    id integer NOT NULL,
    item_id integer NOT NULL,
    ingredient_category_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_id integer NOT NULL,
    notes character varying(500),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.tech_card_item_ingredients OWNER TO coffee_user;

--
-- Name: tech_card_item_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.tech_card_item_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tech_card_item_ingredients_id_seq OWNER TO coffee_user;

--
-- Name: tech_card_item_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.tech_card_item_ingredients_id_seq OWNED BY public.tech_card_item_ingredients.id;


--
-- Name: tech_card_items; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.tech_card_items (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name character varying(200) NOT NULL,
    description character varying(1000),
    selling_price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    approval_status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.tech_card_items OWNER TO coffee_user;

--
-- Name: tech_card_items_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.tech_card_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tech_card_items_id_seq OWNER TO coffee_user;

--
-- Name: tech_card_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.tech_card_items_id_seq OWNED BY public.tech_card_items.id;


--
-- Name: units; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    symbol character varying(10) NOT NULL,
    unit_type character varying(20) NOT NULL,
    base_unit_id integer,
    conversion_factor numeric(10,4) DEFAULT 1.0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    business_id integer NOT NULL,
    description character varying(500)
);


ALTER TABLE public.units OWNER TO coffee_user;

--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.units_id_seq OWNER TO coffee_user;

--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- Name: user_businesses; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.user_businesses (
    user_id integer NOT NULL,
    business_id integer NOT NULL,
    role_in_business character varying(100) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_businesses OWNER TO coffee_user;

--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL,
    business_id integer,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO coffee_user;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permissions_id_seq OWNER TO coffee_user;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: coffee_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    refresh_token character varying(500),
    refresh_token_expires timestamp with time zone
);


ALTER TABLE public.users OWNER TO coffee_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: coffee_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO coffee_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: coffee_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_trail id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.audit_trail ALTER COLUMN id SET DEFAULT nextval('public.audit_trail_id_seq'::regclass);


--
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: expense_records id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_records ALTER COLUMN id SET DEFAULT nextval('public.expense_records_id_seq'::regclass);


--
-- Name: expense_sections id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_sections ALTER COLUMN id SET DEFAULT nextval('public.expense_sections_id_seq'::regclass);


--
-- Name: ingredient_cost_history id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.ingredient_cost_history ALTER COLUMN id SET DEFAULT nextval('public.ingredient_cost_history_id_seq'::regclass);


--
-- Name: inventory_balances id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.inventory_balances ALTER COLUMN id SET DEFAULT nextval('public.inventory_balances_id_seq'::regclass);


--
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: month_periods id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.month_periods ALTER COLUMN id SET DEFAULT nextval('public.month_periods_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: starting_inventory id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.starting_inventory ALTER COLUMN id SET DEFAULT nextval('public.starting_inventory_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: tech_card_item_ingredients id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_item_ingredients ALTER COLUMN id SET DEFAULT nextval('public.tech_card_item_ingredients_id_seq'::regclass);


--
-- Name: tech_card_items id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_items ALTER COLUMN id SET DEFAULT nextval('public.tech_card_items_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.alembic_version (version_num) FROM stdin;
c7d350ee55a8
\.


--
-- Data for Name: audit_trail; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.audit_trail (id, table_name, record_id, action, old_value, new_value, user_id, business_id, "timestamp") FROM stdin;
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.businesses (id, name, city, address, owner_id, is_active, created_at, updated_at, tech_card_requires_approval) FROM stdin;
1	Моя кофейня красота	Сочи	22 street Ave. park	1	t	2025-11-15 20:58:45.203638	2025-11-15 20:58:45.203643	f
2	Конституции СССР 18	Сочи	ул. Конституции СССР 18	2	f	2025-11-17 17:11:39.602237	2026-01-05 09:26:35.094109	f
3	Конституция 2	Сочи	ул. Конституции СССР 18	2	t	2026-01-05 09:28:36.112788	2026-01-05 09:28:36.112791	f
4	Test shop	Moscow	my street	1	f	2026-01-07 15:01:24.637379	2026-01-07 15:02:16.166503	f
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.expense_categories (id, name, section_id, business_id, default_unit_id, is_active, order_index, created_at, updated_at, created_by) FROM stdin;
1	Молоко безлактозное	1	1	2	t	0	2025-11-15 21:02:30.124379	2025-11-15 21:02:30.124384	1
2	Молоко 3.2	1	1	2	t	0	2025-11-15 21:02:42.039039	2025-11-15 21:02:42.039043	1
50	Bombbar Протеиновые батончики Малиновый сорбент Бомбар	10	3	17	t	0	2026-01-12 09:43:09.567864	2026-01-12 09:43:09.567868	2
51	Bombbar Протеиновые батончики Фисташковая меренга Бомбар	10	3	17	t	0	2026-01-12 09:45:22.504404	2026-01-12 09:45:22.504408	2
3	Pellini (Италия)	2	2	4	t	0	2025-11-20 11:15:49.299488	2025-11-20 13:50:46.922388	2
52	Шоколад Ritter Sport карамельный мусс с миндалем 100гр	10	3	17	t	0	2026-01-12 10:11:12.76967	2026-01-12 10:11:12.769696	2
4	Chava (Турция)	2	2	4	t	1	2025-11-20 13:50:02.749113	2025-11-20 13:51:02.555272	2
5	Молоко (классика) 3.2%	3	2	5	t	0	2025-11-20 13:55:31.334902	2025-11-20 13:55:49.770657	2
6	Сливки	3	2	5	t	0	2025-11-20 13:57:03.346094	2025-11-20 13:57:03.346101	2
7	Велле (фундук)	3	2	5	t	2	2025-11-22 10:45:43.476815	2025-11-22 10:46:04.02099	2
8	Малина с листьями	4	2	7	t	0	2025-11-22 11:37:28.439307	2025-11-22 11:37:28.439312	2
9	Ваниль натуральная	4	2	7	t	0	2025-11-22 11:37:55.167654	2025-11-22 11:37:55.167662	2
10	Соленая карамель	4	2	7	t	0	2025-11-22 11:38:18.470799	2025-11-22 11:38:18.470803	2
11	Кокосовый	4	2	7	t	0	2025-11-23 10:54:39.232775	2025-11-23 10:54:39.23278	2
12	Стакан 350мл	5	2	8	t	0	2025-11-23 11:48:29.263625	2025-11-23 11:48:29.263629	2
13	Стакан 400мл	5	2	8	t	0	2025-11-23 11:49:02.428174	2025-11-23 11:49:02.428178	2
14	Стакан 250мл	5	2	8	t	0	2025-11-23 11:49:28.703775	2025-11-23 11:49:28.703784	2
15	Стакан 250мл двухслойный	5	2	8	t	0	2025-11-23 11:51:43.758691	2025-11-23 11:51:43.758724	2
16	Крышка 90мм	5	2	8	t	0	2025-11-23 11:53:11.067659	2025-11-23 11:53:11.067665	2
17	Крышка 80мм	5	2	8	t	0	2025-11-23 11:53:34.984148	2025-11-23 11:53:34.984152	2
18	Кассовая лента	5	2	8	t	0	2025-11-23 11:53:51.684312	2025-11-23 11:53:51.684316	2
19	Манжет на стакан	5	2	8	t	0	2025-11-23 11:54:22.593106	2025-11-23 11:54:22.593111	2
20	Трубочки для напитков	5	2	8	t	0	2025-11-23 11:54:44.185925	2025-11-23 11:54:44.185929	2
21	Уголок бумажный	5	2	8	t	0	2025-11-23 11:55:07.204616	2025-11-23 11:55:07.20462	2
22	Арабика	6	1	11	t	0	2026-01-04 13:05:22.996452	2026-01-04 13:05:22.99646	1
23	Ремонт	7	3	17	t	0	2026-01-05 10:16:30.289441	2026-01-05 10:16:30.289446	2
24	Реклама	7	3	17	t	0	2026-01-05 10:24:50.16212	2026-01-05 10:24:50.162125	2
26	Сироп Мята с Эвкалиптом Herbarista	8	3	18	t	0	2026-01-05 10:46:27.841796	2026-01-05 10:46:27.841801	2
27	Концентрат Глинтвейн безалкогольный	8	3	15	t	0	2026-01-05 10:47:55.882647	2026-01-05 10:47:55.882654	2
53	Шоколад Ritter Sport кокос 100гр	10	3	17	t	0	2026-01-12 10:16:31.358163	2026-01-12 10:16:31.358169	2
25	Сироп Соленая карамель Herbarista	8	3	18	t	0	2026-01-05 10:42:11.449721	2026-01-05 11:20:23.089031	2
28	Молоко 3,2%	9	3	15	t	0	2026-01-07 09:55:03.881535	2026-01-07 09:55:03.881541	2
30	Корица	11	3	21	t	0	2026-01-07 10:05:51.642262	2026-01-07 10:05:51.642267	2
31	Шоколад Ritter Sport Шоколадное печенье с орехами молочный 100гр	10	3	22	t	0	2026-01-07 10:08:57.642117	2026-01-07 10:08:57.642123	2
32	Шоколад Ritter Sport Вафля и какао-мусс	10	3	22	t	0	2026-01-07 10:21:43.875479	2026-01-07 10:21:43.875483	2
33	Шоколад Ritter Sport молочный Лесной орех 100гр	10	3	22	t	0	2026-01-07 10:34:39.179549	2026-01-07 10:34:39.179553	2
34	Доставка	7	3	17	t	0	2026-01-07 10:35:53.755074	2026-01-07 10:35:53.75508	2
39	Крышка 90мм для стакана ВЗЛП д.ПП оранжевая	13	3	17	t	0	2026-01-07 11:32:04.599368	2026-01-07 11:32:04.599373	2
41	Кассовая лента 57х30	13	3	17	t	0	2026-01-07 11:35:36.208849	2026-01-07 11:35:36.208853	2
42	Держатель для 2-х стаканов, 193х108х42 мм, картоннный	13	3	17	t	0	2026-01-07 11:37:03.200308	2026-01-07 11:37:03.200313	2
35	Кофе Pellini италия Пеллини	12	3	13	t	0	2026-01-07 10:52:31.83315	2026-01-07 11:49:13.368742	2
54	Шоколад Ritter Sport Extra Nut Цельный миндаль 100гр Риттер Спорт	10	3	17	t	0	2026-01-12 10:18:57.161924	2026-01-12 10:18:57.161928	2
40	Крышка 80мм для стаканная оранжевая	13	3	17	t	0	2026-01-07 11:34:36.361886	2026-01-07 11:49:39.476545	2
43	Интернет	7	3	17	t	0	2026-01-08 13:44:20.69002	2026-01-08 13:44:20.690023	2
44	Tassay 0,5 Тассай	14	3	17	t	0	2026-01-08 13:48:39.110444	2026-01-08 13:48:39.110449	2
47	Fitnes Shock протеиновое печенье Фитнес Шок	10	3	17	t	0	2026-01-12 09:28:56.627673	2026-01-12 09:28:56.627678	2
48	Bombbar Wafer протеиновые вафли Ореховый пломбир Бомбар	10	3	17	t	0	2026-01-12 09:30:53.302871	2026-01-12 09:38:03.214311	2
49	Snaq Fabriq Протеиновые батончики Арахис и Карамель Снекер	10	3	17	t	0	2026-01-12 09:40:52.950122	2026-01-12 09:40:52.950127	2
55	Шоколад Ritter Sport соленая кешью 100гр Риттер Спорт	10	3	17	t	0	2026-01-12 10:20:29.289468	2026-01-12 10:20:29.289472	2
56	Жевательная резинка Orbit Орбит	10	3	17	t	0	2026-01-12 10:22:15.974087	2026-01-12 10:22:15.974091	2
57	Круассан 7 Day с кремом какао 65гр Сэвэн Дэйс	10	3	17	t	0	2026-01-12 10:24:20.274915	2026-01-12 10:24:20.274921	2
58	Миндаль жаренный 45гр	11	3	29	t	0	2026-01-12 10:26:45.59238	2026-01-12 10:26:45.592385	2
59	Стакан 250мл белый/крафт двухслойный	13	3	17	t	0	2026-01-12 10:40:37.284341	2026-01-12 10:40:37.284345	2
38	Бумажный стакан 250мл Тиффани	13	3	17	t	0	2026-01-07 11:29:19.721782	2026-01-12 10:53:21.680283	2
37	Бумажный стакан 350мл диаметр Бирюза	13	3	17	t	0	2026-01-07 11:27:35.743899	2026-01-12 10:53:45.212221	2
60	Сливки 10%	9	3	15	t	0	2026-01-12 11:16:29.35983	2026-01-12 11:16:29.359834	2
36	Бумажный стакан 450мл Бирюза	13	3	17	t	0	2026-01-07 11:23:18.929265	2026-01-12 11:03:52.451155	2
61	Сироп 20мл	8	3	30	t	0	2026-01-12 11:29:16.574676	2026-01-12 11:29:16.574683	2
63	Цезарь сэндвич	15	3	17	t	0	2026-01-14 13:52:15.005988	2026-01-14 13:52:15.005992	2
62	Ветчина/Сыр сэндвич	15	3	17	t	0	2026-01-14 13:51:50.919419	2026-01-14 13:52:34.513285	2
64	Tassay вода Тассай 0,5 газ	14	3	17	t	0	2026-01-14 13:59:11.178308	2026-01-14 13:59:11.178316	2
65	Миндальное молоко	9	3	15	t	0	2026-01-14 14:19:24.202779	2026-01-14 14:19:24.202784	2
46	Кокосовое молоко	9	3	15	t	0	2026-01-12 08:43:40.855884	2026-01-14 14:19:47.830569	2
29	Шоколадка Альпин Гольд 80гр	10	3	19	t	0	2026-01-07 10:04:09.171345	2026-01-28 07:15:18.749162	2
45	Безлактозное молоко	9	3	15	t	0	2026-01-12 08:41:13.505766	2026-01-14 14:19:41.370422	2
66	Банановое молоко	9	3	15	t	0	2026-01-14 14:20:05.457963	2026-01-14 14:20:05.457967	2
67	Фундучное молоко	9	3	15	t	0	2026-01-14 14:20:27.072465	2026-01-14 14:20:27.072469	2
68	Мороженное ванильное 800гр	16	3	31	t	0	2026-01-28 06:48:43.709579	2026-01-28 06:48:43.709582	2
69	Лёд	16	3	13	t	0	2026-01-28 08:38:06.314949	2026-01-28 08:38:06.314954	2
70	Прозрачный стакан 450мл	13	3	17	t	0	2026-01-28 08:40:20.817034	2026-01-28 08:40:20.817037	2
71	Купольная крышка	13	3	17	t	0	2026-01-28 08:40:47.195995	2026-01-28 08:40:47.195999	2
72	Золотой ярлык какао порошок 100гр	10	3	33	t	0	2026-01-28 09:11:17.616222	2026-01-28 09:11:17.616226	2
73	Хрутка какао порошок 250гр	10	3	34	t	0	2026-01-28 09:13:58.072325	2026-01-28 09:13:58.072329	2
74	Арахисовая паста	10	3	35	t	0	2026-01-28 09:46:41.67609	2026-01-28 09:46:41.676096	2
75	Черный чай	17	3	36	t	0	2026-01-28 09:56:31.124627	2026-01-28 09:56:31.12463	2
76	Манжет для стакана	13	3	17	t	0	2026-01-28 10:00:01.406345	2026-01-28 10:00:01.40635	2
77	Пакеты для заваривания чая	13	3	17	t	0	2026-01-28 10:07:05.281175	2026-01-28 10:07:05.281179	2
\.


--
-- Data for Name: expense_records; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.expense_records (id, category_id, month_period_id, date, quantity_used, unit_id, invoice_item_id, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: expense_sections; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.expense_sections (id, name, business_id, order_index, is_active, created_at, updated_at, created_by) FROM stdin;
1	Молоко	1	0	t	2025-11-15 20:59:14.651523	2025-11-15 20:59:14.651529	1
2	КОФЕ	2	0	t	2025-11-20 11:04:07.472001	2025-11-20 11:04:07.472006	2
3	МОЛОКО	2	0	t	2025-11-20 13:53:09.710825	2025-11-20 13:53:09.710831	2
4	СИРОПЫ	2	0	t	2025-11-22 11:36:34.20398	2025-11-22 11:36:34.203984	2
5	Расходники	2	0	t	2025-11-23 11:37:48.007115	2025-11-23 11:55:46.701718	2
6	Кофе	1	0	t	2026-01-04 13:03:03.568416	2026-01-04 13:03:03.568421	1
7	Иное	3	0	t	2026-01-05 10:15:21.871608	2026-01-05 10:15:21.871615	2
8	Сиропы	3	0	t	2026-01-05 10:40:47.315932	2026-01-05 10:40:47.315936	2
9	Молоко	3	0	t	2026-01-07 09:54:27.022336	2026-01-07 09:54:27.02234	2
10	Сладкое	3	0	t	2026-01-07 09:57:27.652697	2026-01-07 09:57:27.652701	2
11	Специи	3	0	t	2026-01-07 10:05:06.01927	2026-01-07 10:05:06.019274	2
12	Кофе	3	0	t	2026-01-07 10:51:46.713284	2026-01-07 10:51:46.713291	2
13	Расходники	3	0	t	2026-01-07 11:22:46.321067	2026-01-07 11:22:46.321072	2
14	Вода	3	0	t	2026-01-08 13:47:24.329672	2026-01-08 13:47:24.329678	2
15	Сэндвичи	3	0	t	2026-01-14 13:51:21.886526	2026-01-14 13:51:21.886531	2
16	Заморозка	3	0	t	2026-01-27 16:13:09.092237	2026-01-27 16:13:09.092242	2
17	Чай	3	0	t	2026-01-28 09:51:14.5858	2026-01-28 09:51:14.585804	2
\.


--
-- Data for Name: ingredient_cost_history; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.ingredient_cost_history (id, category_id, business_id, invoice_id, invoice_item_id, cost_per_unit, unit_id, purchase_date, quantity_purchased, total_cost, created_at) FROM stdin;
146	35	3	15	66	1982.00	13	2025-12-30	18.000	35676.00	2026-01-07 15:49:35.652688
147	34	3	15	67	1960.00	17	2025-12-30	1.000	1960.00	2026-01-07 15:49:35.652695
148	43	3	16	78	599.00	17	2026-01-07	1.000	599.00	2026-01-08 13:50:37.171465
150	28	3	18	80	82.99	15	2026-01-08	12.000	995.88	2026-01-12 08:42:25.31501
151	45	3	18	81	149.99	15	2026-01-08	1.000	149.99	2026-01-12 08:42:25.315015
152	34	3	18	82	59.00	17	2026-01-08	1.000	59.00	2026-01-12 08:42:25.315016
8	2	1	8	32	2400.00	3	2026-01-04	4.000	9600.00	2026-01-04 13:53:00.581556
9	22	1	8	33	24350.00	12	2026-01-04	3.000	73050.00	2026-01-04 13:53:00.58156
10	23	3	9	34	243.00	17	2026-01-03	1.000	243.00	2026-01-05 10:22:44.928149
11	24	3	10	35	1000.00	17	2026-01-04	1.000	1000.00	2026-01-05 10:27:05.123324
153	25	3	11	75	854.05	18	2026-01-05	1.000	854.05	2026-01-12 08:42:33.387734
154	26	3	11	76	730.55	18	2026-01-05	1.000	730.55	2026-01-12 08:42:33.387738
155	27	3	11	77	647.90	15	2026-01-05	1.000	647.90	2026-01-12 08:42:33.387739
156	29	3	19	83	90.00	19	2026-01-12	1.000	90.00	2026-01-12 08:46:44.830082
157	46	3	19	84	110.00	15	2026-01-12	2.000	220.00	2026-01-12 08:46:44.830087
158	47	3	20	85	86.22	17	2026-01-08	9.000	776.00	2026-01-12 09:46:27.060544
159	48	3	20	86	92.92	17	2026-01-08	12.000	1115.00	2026-01-12 09:46:27.060548
160	49	3	20	87	75.83	17	2026-01-08	12.000	910.00	2026-01-12 09:46:27.060549
161	50	3	20	88	77.42	17	2026-01-08	12.000	929.00	2026-01-12 09:46:27.06055
162	51	3	20	89	77.83	17	2026-01-08	12.000	934.00	2026-01-12 09:46:27.060551
164	44	3	17	90	53.75	17	2026-01-08	24.000	1290.00	2026-01-12 09:46:58.264628
165	52	3	21	91	189.99	17	2026-01-10	1.000	189.99	2026-01-12 10:27:43.363294
166	53	3	21	92	189.99	17	2026-01-10	1.000	189.99	2026-01-12 10:27:43.363297
167	54	3	21	93	179.99	17	2026-01-10	1.000	179.99	2026-01-12 10:27:43.363298
168	55	3	21	94	179.99	17	2026-01-10	1.000	179.99	2026-01-12 10:27:43.363299
169	56	3	21	95	29.99	17	2026-01-10	3.000	89.97	2026-01-12 10:27:43.3633
170	57	3	21	96	44.99	17	2026-01-10	6.000	269.94	2026-01-12 10:27:43.363302
171	58	3	21	97	116.99	29	2026-01-10	1.000	116.99	2026-01-12 10:27:43.363303
172	34	3	21	98	59.00	17	2026-01-10	1.000	59.00	2026-01-12 10:27:43.363304
173	59	3	23	102	5.29	17	2025-12-23	60.000	317.40	2026-01-12 10:46:50.152421
174	60	3	24	103	225.00	15	2026-01-12	12.000	2700.00	2026-01-12 11:16:55.108886
175	24	3	25	107	1005.00	17	2026-01-14	1.000	1005.00	2026-01-14 13:47:31.961299
176	62	3	26	117	135.00	17	2026-01-12	3.000	405.00	2026-01-14 13:54:14.916434
177	63	3	26	118	135.00	17	2026-01-12	3.000	405.00	2026-01-14 13:54:14.916437
180	23	3	27	120	417.00	17	2026-01-13	1.000	417.00	2026-01-14 13:57:19.888141
181	64	3	28	121	69.99	17	2026-01-13	3.000	209.97	2026-01-14 14:03:19.114622
182	28	3	28	122	79.00	15	2026-01-13	9.000	711.00	2026-01-14 14:03:19.114626
183	55	3	28	123	179.99	17	2026-01-13	1.000	179.99	2026-01-14 14:03:19.114628
184	57	3	28	124	47.50	17	2026-01-13	4.000	189.99	2026-01-14 14:03:19.114629
185	34	3	28	125	128.00	17	2026-01-13	1.000	128.00	2026-01-14 14:03:19.11463
194	65	3	29	128	169.99	15	2026-01-14	1.000	169.99	2026-01-14 14:28:26.787535
195	66	3	29	129	114.99	15	2026-01-14	1.000	114.99	2026-01-14 14:28:26.787539
196	67	3	29	130	225.00	15	2026-01-14	1.000	225.00	2026-01-14 14:28:26.787541
197	68	3	30	131	204.00	31	2026-01-28	1.000	204.00	2026-01-28 06:53:53.848528
198	69	3	31	132	200.00	13	2026-01-28	1.000	200.00	2026-01-28 08:38:44.930399
199	70	3	32	133	4.52	17	2026-01-28	500.000	2260.00	2026-01-28 08:42:12.393606
200	71	3	32	134	1.87	17	2026-01-28	500.000	934.00	2026-01-28 08:42:12.39361
201	72	3	33	135	120.00	33	2026-01-28	1.000	120.00	2026-01-28 09:15:56.706452
202	73	3	33	136	190.00	34	2026-01-28	1.000	190.00	2026-01-28 09:15:56.706457
203	74	3	34	137	262.00	35	2026-01-28	1.000	262.00	2026-01-28 09:47:32.097678
139	36	3	14	68	4.78	17	2025-12-30	50.000	239.00	2026-01-07 12:12:50.070359
140	37	3	14	69	4.10	17	2025-12-30	100.000	410.00	2026-01-07 12:12:50.070364
141	38	3	14	70	2.82	17	2025-12-30	50.000	141.23	2026-01-07 12:12:50.070366
142	39	3	14	71	2.40	17	2025-12-30	200.000	479.80	2026-01-07 12:12:50.070368
143	40	3	14	72	2.29	17	2025-12-30	100.000	229.00	2026-01-07 12:12:50.07037
144	41	3	14	73	20.90	17	2025-12-30	3.000	62.70	2026-01-07 12:12:50.070372
145	42	3	14	74	2.85	17	2025-12-30	25.000	71.25	2026-01-07 12:12:50.070373
204	75	3	35	138	480.00	36	2026-01-28	1.000	480.00	2026-01-28 09:57:10.818781
205	76	3	36	139	1.45	17	2026-01-28	125.000	181.00	2026-01-28 10:09:01.193157
206	77	3	37	140	2.44	17	2026-01-28	150.000	366.00	2026-01-28 10:09:02.39217
83	28	3	12	59	82.99	15	2026-01-06	12.000	995.88	2026-01-07 11:43:26.201988
84	29	3	12	60	89.99	19	2026-01-06	1.000	89.99	2026-01-07 11:43:26.201991
85	30	3	12	61	36.99	21	2026-01-06	1.000	36.99	2026-01-07 11:43:26.201993
86	31	3	12	62	199.99	22	2026-01-06	1.000	199.99	2026-01-07 11:43:26.201994
87	32	3	12	63	199.99	22	2026-01-06	1.000	199.99	2026-01-07 11:43:26.201995
88	33	3	12	64	199.99	22	2026-01-06	1.000	199.99	2026-01-07 11:43:26.201996
89	34	3	12	65	59.00	17	2026-01-06	1.000	59.00	2026-01-07 11:43:26.201997
\.


--
-- Data for Name: inventory_balances; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.inventory_balances (id, category_id, month_period_id, opening_balance, purchases_total, usage_total, closing_balance, unit_id, last_calculated, created_at, updated_at) FROM stdin;
10	35	3	0.000	18.000	0.000	18.000	13	2026-01-07 11:10:53.582233	2026-01-07 11:10:53.582238	2026-01-07 11:10:53.58224
8	30	3	0.000	1.000	0.000	1.000	21	2026-01-07 11:43:25.716831	2026-01-07 10:53:24.585239	2026-01-07 11:43:25.716838
9	31	3	0.000	1.000	0.000	1.000	22	2026-01-07 11:43:25.834401	2026-01-07 10:53:24.598151	2026-01-07 11:43:25.834408
3	32	3	0.000	1.000	0.000	1.000	22	2026-01-07 11:43:25.973166	2026-01-07 10:53:24.509225	2026-01-07 11:43:25.973172
4	33	3	0.000	1.000	0.000	1.000	22	2026-01-07 11:43:26.081449	2026-01-07 10:53:24.528301	2026-01-07 11:43:26.081454
11	43	3	0.000	1.000	0.000	1.000	17	2026-01-08 13:50:37.16478	2026-01-08 13:50:37.164784	2026-01-08 13:50:37.164786
13	45	3	0.000	1.000	0.000	1.000	15	2026-01-12 08:42:25.305528	2026-01-12 08:42:25.305532	2026-01-12 08:42:25.305535
14	25	3	0.000	1.000	0.000	1.000	18	2026-01-12 08:42:33.356339	2026-01-12 08:42:33.356344	2026-01-12 08:42:33.356347
15	26	3	0.000	1.000	0.000	1.000	18	2026-01-12 08:42:33.369966	2026-01-12 08:42:33.369969	2026-01-12 08:42:33.369971
16	27	3	0.000	1.000	0.000	1.000	15	2026-01-12 08:42:33.380511	2026-01-12 08:42:33.380515	2026-01-12 08:42:33.380516
7	29	3	0.000	2.000	0.000	2.000	19	2026-01-12 08:46:44.805366	2026-01-07 10:53:24.571194	2026-01-12 08:46:44.805374
17	46	3	0.000	2.000	0.000	2.000	15	2026-01-12 08:46:44.819074	2026-01-12 08:46:44.819079	2026-01-12 08:46:44.819081
18	47	3	0.000	9.000	0.000	9.000	17	2026-01-12 09:46:27.003834	2026-01-12 09:46:27.003838	2026-01-12 09:46:27.003839
19	48	3	0.000	12.000	0.000	12.000	17	2026-01-12 09:46:27.018321	2026-01-12 09:46:27.018325	2026-01-12 09:46:27.018327
20	49	3	0.000	12.000	0.000	12.000	17	2026-01-12 09:46:27.031022	2026-01-12 09:46:27.031027	2026-01-12 09:46:27.031029
21	50	3	0.000	12.000	0.000	12.000	17	2026-01-12 09:46:27.042393	2026-01-12 09:46:27.042397	2026-01-12 09:46:27.042398
22	51	3	0.000	12.000	0.000	12.000	17	2026-01-12 09:46:27.052634	2026-01-12 09:46:27.052637	2026-01-12 09:46:27.052638
12	44	3	0.000	24.000	0.000	24.000	17	2026-01-12 09:46:58.256353	2026-01-08 13:50:41.580567	2026-01-12 09:46:58.25636
23	52	3	0.000	1.000	0.000	1.000	17	2026-01-12 10:27:43.296167	2026-01-12 10:27:43.29617	2026-01-12 10:27:43.296172
24	53	3	0.000	1.000	0.000	1.000	17	2026-01-12 10:27:43.306242	2026-01-12 10:27:43.306245	2026-01-12 10:27:43.306246
25	54	3	0.000	1.000	0.000	1.000	17	2026-01-12 10:27:43.315835	2026-01-12 10:27:43.315839	2026-01-12 10:27:43.31584
27	56	3	0.000	3.000	0.000	3.000	17	2026-01-12 10:27:43.335941	2026-01-12 10:27:43.335945	2026-01-12 10:27:43.335946
29	58	3	0.000	1.000	0.000	1.000	29	2026-01-12 10:27:43.356121	2026-01-12 10:27:43.356125	2026-01-12 10:27:43.356126
30	60	3	0.000	12.000	0.000	12.000	15	2026-01-12 11:16:55.100546	2026-01-12 11:16:55.10055	2026-01-12 11:16:55.100552
2	24	3	0.000	2.000	0.000	2.000	17	2026-01-14 13:47:31.9423	2026-01-05 10:27:05.112588	2026-01-14 13:47:31.942307
31	62	3	0.000	3.000	0.000	3.000	17	2026-01-14 13:54:14.894851	2026-01-14 13:54:14.894855	2026-01-14 13:54:14.894856
32	63	3	0.000	3.000	0.000	3.000	17	2026-01-14 13:54:14.909727	2026-01-14 13:54:14.909731	2026-01-14 13:54:14.909732
1	23	3	0.000	2.000	0.000	2.000	17	2026-01-14 13:57:19.878898	2026-01-05 10:22:44.91458	2026-01-14 13:57:19.878903
33	64	3	0.000	3.000	0.000	3.000	17	2026-01-14 14:03:19.048529	2026-01-14 14:03:19.048533	2026-01-14 14:03:19.048535
5	34	3	0.000	4.000	0.000	4.000	17	2026-01-14 14:03:19.065898	2026-01-07 10:53:24.541978	2026-01-14 14:03:19.065904
26	55	3	0.000	2.000	0.000	2.000	17	2026-01-14 14:03:19.078553	2026-01-12 10:27:43.325413	2026-01-14 14:03:19.078559
28	57	3	0.000	10.000	0.000	10.000	17	2026-01-14 14:03:19.088847	2026-01-12 10:27:43.345964	2026-01-14 14:03:19.088852
6	28	3	0.000	33.000	0.000	33.000	15	2026-01-14 14:03:19.099287	2026-01-07 10:53:24.556585	2026-01-14 14:03:19.099293
34	65	3	0.000	1.000	0.000	1.000	15	2026-01-14 14:28:26.436282	2026-01-14 14:23:36.838919	2026-01-14 14:28:26.436288
35	66	3	0.000	1.000	0.000	1.000	15	2026-01-14 14:28:26.607248	2026-01-14 14:23:36.853515	2026-01-14 14:28:26.607253
36	67	3	0.000	1.000	0.000	1.000	15	2026-01-14 14:28:26.779221	2026-01-14 14:28:26.779226	2026-01-14 14:28:26.779227
37	68	3	0.000	1.000	0.000	1.000	31	2026-01-28 06:53:53.834793	2026-01-28 06:53:53.834798	2026-01-28 06:53:53.834799
38	69	3	0.000	1.000	0.000	1.000	13	2026-01-28 08:38:44.920191	2026-01-28 08:38:44.920195	2026-01-28 08:38:44.920198
39	70	3	0.000	500.000	0.000	500.000	17	2026-01-28 08:42:12.36141	2026-01-28 08:42:12.361414	2026-01-28 08:42:12.361415
40	71	3	0.000	500.000	0.000	500.000	17	2026-01-28 08:42:12.38074	2026-01-28 08:42:12.380744	2026-01-28 08:42:12.380746
41	72	3	0.000	1.000	0.000	1.000	33	2026-01-28 09:15:56.676226	2026-01-28 09:15:56.676232	2026-01-28 09:15:56.676234
42	73	3	0.000	1.000	0.000	1.000	34	2026-01-28 09:15:56.698007	2026-01-28 09:15:56.698012	2026-01-28 09:15:56.698014
43	74	3	0.000	1.000	0.000	1.000	35	2026-01-28 09:47:32.089091	2026-01-28 09:47:32.089095	2026-01-28 09:47:32.089096
44	75	3	0.000	1.000	0.000	1.000	36	2026-01-28 09:57:10.812573	2026-01-28 09:57:10.812576	2026-01-28 09:57:10.812578
45	76	3	0.000	125.000	0.000	125.000	17	2026-01-28 10:09:01.179484	2026-01-28 10:09:01.179488	2026-01-28 10:09:01.179491
46	77	3	0.000	150.000	0.000	150.000	17	2026-01-28 10:09:02.385031	2026-01-28 10:09:02.385035	2026-01-28 10:09:02.385037
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.invoice_items (id, invoice_id, category_id, quantity, unit_id, unit_price, total_price, created_at, updated_at) FROM stdin;
3	3	5	24.000	5	107.0000	2568.00	2025-11-22 10:46:30.212325	2025-11-22 10:46:30.212327
4	3	6	12.000	5	225.0000	2700.00	2025-11-22 10:46:30.277632	2025-11-22 10:46:30.277636
5	4	5	24.000	5	107.0000	2568.00	2025-11-22 11:15:45.195549	2025-11-22 11:15:45.195553
6	4	6	12.000	5	225.0000	2700.00	2025-11-22 11:15:45.263457	2025-11-22 11:15:45.263461
7	4	7	1.000	5	225.0000	225.00	2025-11-22 11:15:45.329794	2025-11-22 11:15:45.329797
11	5	8	1.000	7	759.0500	759.05	2025-11-23 11:00:41.910694	2025-11-23 11:00:41.910697
12	5	9	1.000	7	759.0500	759.05	2025-11-23 11:00:42.008366	2025-11-23 11:00:42.00837
13	5	10	1.000	7	759.0500	759.05	2025-11-23 11:00:42.100429	2025-11-23 11:00:42.100433
14	5	11	1.000	7	759.0500	759.05	2025-11-23 11:00:42.205173	2025-11-23 11:00:42.205176
15	6	12	200.000	8	4.1000	820.00	2025-11-23 12:59:26.05126	2025-11-23 12:59:26.051263
16	6	13	50.000	8	4.7800	239.00	2025-11-23 12:59:26.16134	2025-11-23 12:59:26.161343
17	6	14	100.000	8	2.8245	282.45	2025-11-23 12:59:26.262068	2025-11-23 12:59:26.26207
18	6	15	50.000	8	5.6500	282.50	2025-11-23 12:59:26.372959	2025-11-23 12:59:26.372962
19	6	16	200.000	8	2.3990	479.80	2025-11-23 12:59:26.483275	2025-11-23 12:59:26.483278
20	6	17	150.000	8	2.2900	343.50	2025-11-23 12:59:26.583936	2025-11-23 12:59:26.583939
21	6	18	5.000	8	20.9000	104.50	2025-11-23 12:59:26.687061	2025-11-23 12:59:26.687065
22	6	19	100.000	8	1.4900	149.00	2025-11-23 12:59:26.789587	2025-11-23 12:59:26.78959
23	6	20	250.000	8	0.7500	187.50	2025-11-23 12:59:26.919904	2025-11-23 12:59:26.919907
24	6	21	100.000	8	0.9600	96.00	2025-11-23 12:59:27.023553	2025-11-23 12:59:27.023555
32	8	2	4.000	3	2400.0000	9600.00	2026-01-04 13:53:00.220015	2026-01-04 13:53:00.220019
33	8	22	3.000	12	24350.0000	73050.00	2026-01-04 13:53:00.573063	2026-01-04 13:53:00.573066
34	9	23	1.000	17	243.0000	243.00	2026-01-05 10:19:08.178432	2026-01-05 10:19:08.178434
35	10	24	1.000	17	1000.0000	1000.00	2026-01-05 10:27:00.411476	2026-01-05 10:27:00.411479
59	12	28	12.000	15	82.9900	995.88	2026-01-07 11:43:25.441426	2026-01-07 11:43:25.441429
60	12	29	1.000	19	89.9900	89.99	2026-01-07 11:43:25.592328	2026-01-07 11:43:25.592331
61	12	30	1.000	21	36.9900	36.99	2026-01-07 11:43:25.701789	2026-01-07 11:43:25.701792
62	12	31	1.000	22	199.9900	199.99	2026-01-07 11:43:25.821428	2026-01-07 11:43:25.821431
63	12	32	1.000	22	199.9900	199.99	2026-01-07 11:43:25.960065	2026-01-07 11:43:25.960068
64	12	33	1.000	22	199.9900	199.99	2026-01-07 11:43:26.071236	2026-01-07 11:43:26.071239
65	12	34	1.000	17	59.0000	59.00	2026-01-07 11:43:26.184048	2026-01-07 11:43:26.184051
66	15	35	18.000	13	1982.0000	35676.00	2026-01-07 12:11:38.96654	2026-01-07 12:11:38.966544
67	15	34	1.000	17	1960.0000	1960.00	2026-01-07 12:11:39.075866	2026-01-07 12:11:39.07587
68	14	36	50.000	17	4.7800	239.00	2026-01-07 12:12:49.395026	2026-01-07 12:12:49.39503
69	14	37	100.000	17	4.1000	410.00	2026-01-07 12:12:49.501392	2026-01-07 12:12:49.501395
70	14	38	50.000	17	2.8200	141.23	2026-01-07 12:12:49.612319	2026-01-07 12:12:49.612322
71	14	39	200.000	17	2.4000	479.80	2026-01-07 12:12:49.729587	2026-01-07 12:12:49.72959
72	14	40	100.000	17	2.2900	229.00	2026-01-07 12:12:49.834411	2026-01-07 12:12:49.834415
73	14	41	3.000	17	20.9000	62.70	2026-01-07 12:12:49.949938	2026-01-07 12:12:49.949942
74	14	42	25.000	17	2.8500	71.25	2026-01-07 12:12:50.060701	2026-01-07 12:12:50.060704
75	11	25	1.000	18	854.0500	854.05	2026-01-07 12:14:49.80551	2026-01-07 12:14:49.805514
76	11	26	1.000	18	730.5500	730.55	2026-01-07 12:14:49.894019	2026-01-07 12:14:49.894022
77	11	27	1.000	15	647.9000	647.90	2026-01-07 12:14:49.986013	2026-01-07 12:14:49.986017
78	16	43	1.000	17	599.0000	599.00	2026-01-08 13:44:49.633269	2026-01-08 13:44:49.633273
80	18	28	12.000	15	82.9900	995.88	2026-01-12 08:42:11.162974	2026-01-12 08:42:11.162977
81	18	45	1.000	15	149.9900	149.99	2026-01-12 08:42:11.263843	2026-01-12 08:42:11.263847
82	18	34	1.000	17	59.0000	59.00	2026-01-12 08:42:11.361261	2026-01-12 08:42:11.361264
83	19	29	1.000	19	90.0000	90.00	2026-01-12 08:45:59.803189	2026-01-12 08:45:59.803192
84	19	46	2.000	15	110.0000	220.00	2026-01-12 08:45:59.91316	2026-01-12 08:45:59.913163
85	20	47	9.000	17	86.2200	776.00	2026-01-12 09:46:20.890891	2026-01-12 09:46:20.890895
86	20	48	12.000	17	92.9200	1115.00	2026-01-12 09:46:21.013068	2026-01-12 09:46:21.013071
87	20	49	12.000	17	75.8300	910.00	2026-01-12 09:46:21.149792	2026-01-12 09:46:21.149795
88	20	50	12.000	17	77.4200	929.00	2026-01-12 09:46:21.267116	2026-01-12 09:46:21.267119
89	20	51	12.000	17	77.8300	934.00	2026-01-12 09:46:21.393432	2026-01-12 09:46:21.393435
90	17	44	24.000	17	53.7500	1290.00	2026-01-12 09:46:58.244717	2026-01-12 09:46:58.24472
91	21	52	1.000	17	189.9900	189.99	2026-01-12 10:27:36.596555	2026-01-12 10:27:36.596561
92	21	53	1.000	17	189.9900	189.99	2026-01-12 10:27:36.698531	2026-01-12 10:27:36.698534
93	21	54	1.000	17	179.9900	179.99	2026-01-12 10:27:36.795906	2026-01-12 10:27:36.795909
94	21	55	1.000	17	179.9900	179.99	2026-01-12 10:27:36.892105	2026-01-12 10:27:36.892108
95	21	56	3.000	17	29.9900	89.97	2026-01-12 10:27:37.001493	2026-01-12 10:27:37.001495
96	21	57	6.000	17	44.9900	269.94	2026-01-12 10:27:37.106266	2026-01-12 10:27:37.10627
97	21	58	1.000	29	116.9900	116.99	2026-01-12 10:27:37.236539	2026-01-12 10:27:37.236542
98	21	34	1.000	17	59.0000	59.00	2026-01-12 10:27:37.353225	2026-01-12 10:27:37.353228
102	23	59	60.000	17	5.2900	317.40	2026-01-12 10:41:30.197301	2026-01-12 10:41:30.197305
103	24	60	12.000	15	225.0000	2700.00	2026-01-12 11:16:50.273356	2026-01-12 11:16:50.273359
107	25	24	1.000	17	1005.0000	1005.00	2026-01-14 13:47:28.364761	2026-01-14 13:47:28.364765
114	22	28	16.000	15	87.9900	1407.84	2026-01-14 13:48:11.759612	2026-01-14 13:48:11.759616
115	22	57	2.000	17	44.9900	89.98	2026-01-14 13:48:11.911349	2026-01-14 13:48:11.911352
116	22	34	1.000	17	59.0000	59.00	2026-01-14 13:48:12.073153	2026-01-14 13:48:12.073155
117	26	62	3.000	17	135.0000	405.00	2026-01-14 13:54:09.995846	2026-01-14 13:54:09.99585
118	26	63	3.000	17	135.0000	405.00	2026-01-14 13:54:10.152071	2026-01-14 13:54:10.152074
120	27	23	1.000	17	417.0000	417.00	2026-01-14 13:57:19.862308	2026-01-14 13:57:19.86231
121	28	64	3.000	17	69.9900	209.97	2026-01-14 14:03:12.986989	2026-01-14 14:03:12.986993
122	28	28	9.000	15	79.0000	711.00	2026-01-14 14:03:13.191765	2026-01-14 14:03:13.19177
123	28	55	1.000	17	179.9900	179.99	2026-01-14 14:03:13.348186	2026-01-14 14:03:13.348188
124	28	57	4.000	17	47.5000	189.99	2026-01-14 14:03:13.492478	2026-01-14 14:03:13.492482
125	28	34	1.000	17	128.0000	128.00	2026-01-14 14:03:14.029233	2026-01-14 14:03:14.029236
128	29	65	1.000	15	169.9900	169.99	2026-01-14 14:28:26.418452	2026-01-14 14:28:26.418455
129	29	66	1.000	15	114.9900	114.99	2026-01-14 14:28:26.595482	2026-01-14 14:28:26.595486
130	29	67	1.000	15	225.0000	225.00	2026-01-14 14:28:26.766852	2026-01-14 14:28:26.766855
131	30	68	1.000	31	204.0000	204.00	2026-01-28 06:49:17.282396	2026-01-28 06:49:17.2824
132	31	69	1.000	13	200.0000	200.00	2026-01-28 08:38:29.3612	2026-01-28 08:38:29.361203
133	32	70	500.000	17	4.5200	2260.00	2026-01-28 08:42:05.176104	2026-01-28 08:42:05.176107
134	32	71	500.000	17	1.8700	934.00	2026-01-28 08:42:05.295604	2026-01-28 08:42:05.295607
135	33	72	1.000	33	120.0000	120.00	2026-01-28 09:14:24.463121	2026-01-28 09:14:24.463125
136	33	73	1.000	34	190.0000	190.00	2026-01-28 09:14:24.554341	2026-01-28 09:14:24.554344
137	34	74	1.000	35	262.0000	262.00	2026-01-28 09:47:23.373268	2026-01-28 09:47:23.373271
138	35	75	1.000	36	480.0000	480.00	2026-01-28 09:57:06.193809	2026-01-28 09:57:06.193811
139	36	76	125.000	17	1.4500	181.00	2026-01-28 10:00:35.792643	2026-01-28 10:00:35.792646
140	37	77	150.000	17	2.4400	366.00	2026-01-28 10:08:52.894466	2026-01-28 10:08:52.894469
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.invoices (id, business_id, supplier_id, invoice_number, invoice_date, total_amount, paid_status, paid_date, document_path, created_at, updated_at, created_by) FROM stdin;
17	3	12	\N	2026-01-08 00:00:00	1290.00	paid	2026-01-08 13:50:41.568651	\N	2026-01-08 13:49:13.527984	2026-01-12 09:46:58.269087	2
8	1	6	\N	2026-01-04 00:00:00	82650.00	paid	2026-01-04 13:07:39.199975	\N	2026-01-04 13:07:36.108738	2026-01-04 13:53:00.588058	1
9	3	7	\N	2026-01-03 00:00:00	243.00	paid	2026-01-05 10:22:44.891299	\N	2026-01-05 10:19:08.071858	2026-01-05 10:22:44.891309	2
3	2	3	№ ДР008766 от 1 ноября 2025	2025-11-01 00:00:00	5268.00	overdue	\N	\N	2025-11-22 10:46:30.149168	2025-11-22 10:47:27.290498	2
22	3	13	\N	2026-01-11 00:00:00	1556.82	overdue	\N	\N	2026-01-12 10:29:57.75289	2026-01-14 13:48:12.079138	2
10	3	7	\N	2026-01-04 00:00:00	1000.00	paid	2026-01-05 10:27:05.091861	\N	2026-01-05 10:27:00.314877	2026-01-05 10:27:05.091868	2
4	2	3	№ ДР008766 от 1 ноября 2025	2025-11-01 00:00:00	5493.00	overdue	\N	\N	2025-11-22 11:15:45.130982	2025-11-22 11:15:54.030824	2
35	3	7	_	2026-01-28 00:00:00	480.00	paid	2026-01-28 09:57:10.799237	\N	2026-01-28 09:57:06.036701	2026-01-28 09:57:10.799243	2
26	3	14	-	2026-01-12 00:00:00	810.00	paid	2026-01-14 13:54:14.878115	\N	2026-01-14 13:54:09.845271	2026-01-14 13:54:14.878122	2
21	3	13	\N	2026-01-10 00:00:00	1275.86	paid	2026-01-12 10:27:43.274783	\N	2026-01-12 10:27:36.490778	2026-01-12 10:27:43.274799	2
5	2	4	№ УТ-9281 от 1 ноября 2025	2025-11-01 00:00:00	3036.20	overdue	\N	\N	2025-11-23 10:33:46.087589	2025-11-23 11:00:42.210697	2
36	3	7	_	2026-01-28 00:00:00	181.00	paid	2026-01-28 10:09:01.153639	\N	2026-01-28 10:00:35.634615	2026-01-28 10:09:01.153647	2
27	3	7	-	2026-01-13 00:00:00	417.00	paid	2026-01-14 13:55:19.329347	\N	2026-01-14 13:55:15.195874	2026-01-14 13:57:19.893023	2
14	3	11	1111 от 29 декабря 2025	2025-12-30 00:00:00	1632.98	paid	2026-01-07 11:42:42.703452	\N	2026-01-07 11:37:42.2161	2026-01-07 12:12:50.077079	2
37	3	7	_	2026-01-28 00:00:00	366.00	paid	2026-01-28 10:09:02.370896	\N	2026-01-28 10:08:52.32698	2026-01-28 10:09:02.370902	2
23	3	7	\N	2025-12-23 00:00:00	317.40	paid	2026-01-12 10:46:50.14005	\N	2026-01-12 10:41:30.097016	2026-01-12 10:46:50.140056	2
6	2	5	2911 от 1 ноября 2025	2025-11-01 00:00:00	2984.25	overdue	\N	\N	2025-11-23 12:59:25.939182	2025-11-23 13:01:18.88223	2
24	3	7	\N	2026-01-12 00:00:00	2700.00	paid	2026-01-12 11:16:55.086959	\N	2026-01-12 11:16:50.17225	2026-01-12 11:16:55.086965	2
15	3	10	459 от 22 декабря 2025 г	2025-12-30 00:00:00	37636.00	paid	2026-01-07 15:49:35.633878	\N	2026-01-07 12:11:38.882957	2026-01-07 15:49:35.633889	2
16	3	7	\N	2026-01-07 00:00:00	599.00	paid	2026-01-08 13:50:37.150192	\N	2026-01-08 13:44:49.52802	2026-01-08 13:50:37.150229	2
28	3	13	-	2026-01-13 00:00:00	1418.95	paid	2026-01-14 14:03:19.014484	\N	2026-01-14 14:03:12.836219	2026-01-14 14:03:19.014494	2
18	3	9	\N	2026-01-08 00:00:00	1204.87	paid	2026-01-12 08:42:25.26312	\N	2026-01-12 08:42:11.061264	2026-01-12 08:42:25.263134	2
11	3	8	УТ-53 от 5 января 2026 г.	2026-01-05 00:00:00	2232.50	paid	2026-01-12 08:42:33.340699	\N	2026-01-05 10:48:23.647248	2026-01-12 08:42:33.340708	2
19	3	7	\N	2026-01-12 00:00:00	310.00	paid	2026-01-12 08:46:44.785308	\N	2026-01-12 08:45:59.704686	2026-01-12 08:46:44.785316	2
25	3	7	\N	2026-01-14 00:00:00	1005.00	paid	2026-01-14 13:47:31.913073	\N	2026-01-14 13:47:28.202981	2026-01-14 13:47:31.913081	2
20	3	12	\N	2026-01-08 00:00:00	4664.00	paid	2026-01-12 09:46:26.987393	\N	2026-01-12 09:46:20.717931	2026-01-12 09:46:26.98741	2
29	3	7	\N	2026-01-14 00:00:00	509.98	paid	2026-01-14 14:23:36.823244	\N	2026-01-14 14:23:33.668669	2026-01-14 14:28:26.793274	2
12	3	9	\N	2026-01-06 00:00:00	1781.83	paid	2026-01-07 10:53:24.487006	\N	2026-01-07 10:36:07.815198	2026-01-07 11:43:26.208798	2
30	3	13	_	2026-01-28 00:00:00	204.00	paid	2026-01-28 06:53:53.803762	\N	2026-01-28 06:49:17.143248	2026-01-28 06:53:53.80378	2
31	3	13	_	2026-01-28 00:00:00	200.00	paid	2026-01-28 08:38:44.734024	\N	2026-01-28 08:38:29.251806	2026-01-28 08:38:44.734031	2
32	3	7	_	2026-01-28 00:00:00	3194.00	paid	2026-01-28 08:42:12.333422	\N	2026-01-28 08:42:05.07581	2026-01-28 08:42:12.33343	2
33	3	7	_	2026-01-28 00:00:00	310.00	paid	2026-01-28 09:15:56.650781	\N	2026-01-28 09:14:24.369971	2026-01-28 09:15:56.650788	2
34	3	7	_	2026-01-28 00:00:00	262.00	paid	2026-01-28 09:47:32.072252	\N	2026-01-28 09:47:22.802635	2026-01-28 09:47:32.072258	2
\.


--
-- Data for Name: month_periods; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.month_periods (id, name, business_id, year, month, status, is_active, created_at, updated_at) FROM stdin;
1	November 2025	1	2025	11	active	t	2025-11-15 20:58:55.569274	2025-11-15 20:58:55.569279
2	ноябрь 2025	2	2025	11	active	t	2025-11-17 17:11:53.414034	2025-11-17 17:11:53.414038
3	январь 2026	3	2026	1	active	t	2026-01-05 09:29:03.044029	2026-01-05 09:29:03.044033
4	декабрь 2025	3	2025	12	active	t	2026-01-26 11:26:34.806774	2026-01-26 11:26:34.806777
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.permissions (id, name, description, resource, action, is_active, created_at) FROM stdin;
42	view_api_docs	Access and view API documentation	api	view_docs	t	2025-11-15 16:54:13.931294
48	view_businesses	View business information and members	businesses	view	t	2025-11-15 16:54:13.931294
49	edit_businesses	Edit business information and settings	businesses	edit	t	2025-11-15 16:54:13.931294
50	activate_deactivate_businesses	Activate or deactivate business locations	businesses	activate_deactivate	t	2025-11-15 16:54:13.931294
51	manage_members_businesses	Add/remove members, manage memberships	businesses	manage_members	t	2025-11-15 16:54:13.931294
52	grant_permissions_businesses	Manage member permissions within business	businesses	grant_permissions	t	2025-11-15 16:54:13.931294
21	view_categories	View expense categories	categories	view	t	2025-11-15 16:54:13.931294
22	create_categories	Create new expense categories	categories	create	t	2025-11-15 16:54:13.931294
23	edit_categories	Edit existing expense categories	categories	edit	t	2025-11-15 16:54:13.931294
25	delete_categories	Permanently delete expense categories	categories	delete	t	2025-11-15 16:54:13.931294
24	activate_deactivate_categories	Activate or deactivate expense categories	categories	activate_deactivate	t	2025-11-15 16:54:13.931294
26	view_subcategories	View expense subcategories	subcategories	view	t	2025-11-15 16:54:13.931294
27	create_subcategories	Create new expense subcategories	subcategories	create	t	2025-11-15 16:54:13.931294
28	edit_subcategories	Edit existing expense subcategories	subcategories	edit	t	2025-11-15 16:54:13.931294
30	delete_subcategories	Permanently delete expense subcategories	subcategories	delete	t	2025-11-15 16:54:13.931294
29	activate_deactivate_subcategories	Activate or deactivate expense subcategories	subcategories	activate_deactivate	t	2025-11-15 16:54:13.931294
43	view_suppliers	View supplier information and list suppliers	suppliers	view	t	2025-11-15 16:54:13.931294
44	create_suppliers	Create new suppliers	suppliers	create	t	2025-11-15 16:54:13.931294
45	edit_suppliers	Edit existing supplier information	suppliers	edit	t	2025-11-15 16:54:13.931294
47	delete_suppliers	Delete suppliers	suppliers	delete	t	2025-11-15 16:54:13.931294
46	activate_deactivate_suppliers	Activate or deactivate suppliers	suppliers	activate_deactivate	t	2025-11-15 16:54:13.931294
36	view_invoices	View invoices and invoice details	invoices	view	t	2025-11-15 16:54:13.931294
37	create_invoices	Create new invoices	invoices	create	t	2025-11-15 16:54:13.931294
38	edit_invoices	Edit existing invoices	invoices	edit	t	2025-11-15 16:54:13.931294
39	delete_invoices	Delete invoices	invoices	delete	t	2025-11-15 16:54:13.931294
40	approve_invoices	Approve invoices for processing	invoices	approve	t	2025-11-15 16:54:13.931294
41	reject_invoices	Reject invoices	invoices	reject	t	2025-11-15 16:54:13.931294
31	view_units	View measurement units	units	view	t	2025-11-15 16:54:13.931294
32	create_units	Create new measurement units	units	create	t	2025-11-15 16:54:13.931294
33	edit_units	Edit existing measurement units	units	edit	t	2025-11-15 16:54:13.931294
35	delete_units	Permanently delete measurement units	units	delete	t	2025-11-15 16:54:13.931294
34	activate_deactivate_units	Activate or deactivate measurement units	units	activate_deactivate	t	2025-11-15 16:54:13.931294
53	view_tech_card_items	View technology card items	tech_card_items	view	t	2026-01-04 12:55:35.527195
54	create_tech_card_items	Create technology card items	tech_card_items	create	t	2026-01-04 12:55:35.527195
55	edit_tech_card_items	Edit technology card items	tech_card_items	edit	t	2026-01-04 12:55:35.527195
56	delete_tech_card_items	Delete technology card items	tech_card_items	delete	t	2026-01-04 12:55:35.527195
57	approve_tech_card_items	Approve/reject technology card items	tech_card_items	approve	t	2026-01-04 12:55:35.527195
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.role_permissions (id, role_id, permission_id, is_active, created_at, updated_at) FROM stdin;
114	1	53	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
115	1	54	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
116	1	55	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
117	1	56	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
118	1	57	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
119	3	53	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
120	3	54	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
121	3	55	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
122	3	56	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
123	3	57	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
124	4	53	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
125	4	54	t	2026-01-04 12:55:35.527195	2026-01-04 12:55:35.527195
32	1	21	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
33	1	22	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
34	1	23	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
35	1	24	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
36	1	25	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
37	1	26	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
38	1	27	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
39	1	28	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
40	1	29	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
41	1	30	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
42	1	31	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
43	1	32	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
44	1	33	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
45	1	34	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
46	1	35	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
47	1	36	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
48	1	37	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
49	1	38	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
50	1	39	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
51	1	40	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
52	1	41	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
53	1	42	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
64	3	21	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
65	3	22	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
66	3	23	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
67	3	24	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
68	3	25	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
69	3	26	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
70	3	27	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
71	3	28	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
72	3	29	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
73	3	30	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
74	3	31	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
75	3	32	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
76	3	33	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
77	3	34	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
78	3	35	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
79	3	36	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
80	3	37	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
81	3	38	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
82	3	39	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
83	3	40	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
84	3	41	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
86	4	21	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
87	4	26	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
88	4	29	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
89	4	31	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
90	4	33	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
91	4	34	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
92	4	36	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
93	4	37	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
94	4	38	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
95	1	43	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
96	1	44	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
97	1	45	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
98	1	46	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
99	1	47	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
100	3	43	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
101	3	44	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
102	3	45	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
103	3	46	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
104	3	47	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
105	4	43	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
106	4	44	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
107	4	46	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
108	3	48	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
109	3	49	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
110	3	50	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
111	3	51	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
112	3	52	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
113	4	48	t	2025-11-15 16:54:13.931294	2025-11-15 16:54:13.931294
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.roles (id, name, description) FROM stdin;
1	ADMIN	System administrator
3	BUSINESS_OWNER	Business owner with management access
4	EMPLOYEE	Regular employee with limited access
\.


--
-- Data for Name: starting_inventory; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.starting_inventory (id, business_id, category_id, quantity, unit_id, inventory_date, created_by, notes, created_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.suppliers (id, name, contact_info, business_id, is_active, created_at, updated_at, created_by, payment_terms_days, tax_id) FROM stdin;
2	ИП Морева Л.В.	{"phone": "89096793947", "address": "\\u0433. \\u041c\\u043e\\u0441\\u043a\\u0432\\u0430, \\u0443\\u043b. \\u0420\\u044f\\u0431\\u0438\\u043d\\u043e\\u0432\\u0430\\u044f 55, \\u0441\\u0442\\u0440 3"}	2	t	2025-11-20 11:52:09.320097	2025-11-20 11:52:09.3201	2	14	690707265069
4	ООО "Кухня чемпионов"	{"phone": "89282330233", "address": "\\u0433. \\u0421\\u043e\\u0447\\u0438, \\u0443\\u043b. \\u0422\\u0440\\u0443\\u0434\\u0430 33, \\u043f\\u043e\\u043c\\u0435\\u0449\\u0435\\u043d\\u0438\\u0435 1"}	2	t	2025-11-22 11:43:45.987936	2025-11-22 11:43:45.98794	2	14	2366009489
5	ИП Иванов Владислав Вячеславович	{"address": "\\u0433. \\u0421\\u043e\\u0447\\u0438, \\u0412\\u0438\\u043d\\u043e\\u0433\\u0440\\u0430\\u0434\\u043d\\u044b\\u0439 \\u043f\\u0435\\u0440\\u0435\\u0443\\u043b\\u043e\\u043a, \\u0434. 2\\u0410"}	2	t	2025-11-23 11:17:01.484309	2025-11-23 11:17:01.484313	2	7	772507919166
3	ИП Рогава Диана Арутюновна	{"address": "\\u0433. \\u0421\\u043e\\u0447\\u0438, \\u0443\\u043b. \\u0417\\u0435\\u043c\\u043d\\u0443\\u0445\\u043e\\u0432\\u0430 1"}	2	t	2025-11-22 10:01:57.01284	2025-11-23 11:18:21.050172	2	14	231906004427
6	Пятерочка	null	1	t	2026-01-04 13:01:59.977151	2026-01-04 13:01:59.977155	1	2	1234567
8	ООО "Кухня чемпионов"	null	3	t	2026-01-05 10:39:48.054171	2026-01-05 10:39:48.054174	2	14	2366009489
10	ИП Морева Л. В.	null	3	t	2026-01-07 10:39:39.810775	2026-01-07 10:39:39.81078	2	14	690707265069
11	ООО "Поинт Пак Сочи"	null	3	t	2026-01-07 11:14:59.521918	2026-01-07 11:14:59.521921	2	7	2366047558
13	Окей	null	3	t	2026-01-12 09:48:08.602195	2026-01-12 09:48:08.602199	2	0	.......
14	Сочи снек "Sochi Snack" сэндвичи	null	3	t	2026-01-14 13:49:59.337467	2026-01-14 13:53:04.34841	2	0	.......
9	Магнит	null	3	t	2026-01-07 09:53:58.574958	2026-01-14 13:56:19.068499	2	0	.......
12	Озон	null	3	t	2026-01-12 08:46:28.688432	2026-01-14 13:56:30.014962	2	0	.......
7	Я	null	3	t	2026-01-05 10:18:54.137485	2026-01-14 13:56:44.875456	2	0	.......
\.


--
-- Data for Name: tech_card_item_ingredients; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.tech_card_item_ingredients (id, item_id, ingredient_category_id, quantity, unit_id, notes, sort_order, created_at) FROM stdin;
1	1	2	200.000	1	\N	0	2026-01-04 13:01:32.462641
141	24	35	14.500	23	\N	0	2026-01-14 15:03:01.748116
142	24	45	180.000	16	\N	1	2026-01-14 15:03:01.748121
4	2	22	30.000	9	\N	0	2026-01-04 13:08:57.559273
5	2	2	270.000	1	\N	1	2026-01-04 13:08:57.559276
143	24	37	1.000	17	\N	2	2026-01-14 15:03:01.748123
144	24	39	1.000	17	\N	3	2026-01-14 15:03:01.748124
226	25	35	10.500	23	\N	0	2026-01-26 11:34:42.779924
227	25	60	180.000	16	\N	1	2026-01-26 11:34:42.779927
228	25	37	1.000	17	\N	2	2026-01-26 11:34:42.779929
229	25	39	1.000	17	\N	3	2026-01-26 11:34:42.77993
230	25	25	20.000	16	\N	4	2026-01-26 11:34:42.779931
232	31	35	14.500	23	\N	0	2026-01-26 13:04:55.798908
233	31	65	270.000	16	\N	1	2026-01-26 13:04:55.798912
28	6	35	14.500	23	\N	0	2026-01-12 10:42:06.201868
29	6	59	1.000	17	\N	1	2026-01-12 10:42:06.201872
30	6	40	1.000	17	\N	2	2026-01-12 10:42:06.201875
31	5	35	10.500	23	\N	0	2026-01-12 10:42:44.945243
32	5	59	1.000	17	\N	1	2026-01-12 10:42:44.945247
33	5	40	1.000	17	\N	2	2026-01-12 10:42:44.94525
234	31	36	1.000	17	\N	2	2026-01-26 13:04:55.798914
235	31	39	1.000	17	\N	3	2026-01-26 13:04:55.798915
236	32	35	50.000	23	\N	0	2026-01-26 13:05:46.675195
37	9	35	10.500	23	\N	0	2026-01-12 10:49:42.768294
38	9	28	140.000	16	\N	1	2026-01-12 10:49:42.7683
39	9	38	1.000	17	\N	2	2026-01-12 10:49:42.768302
40	9	40	1.000	17	\N	3	2026-01-12 10:49:42.768304
239	34	35	14.500	23	\N	0	2026-01-26 13:43:08.071255
240	34	67	270.000	16	\N	1	2026-01-26 13:43:08.071258
241	34	36	1.000	17	\N	2	2026-01-26 13:43:08.071259
242	34	39	1.000	17	\N	3	2026-01-26 13:43:08.07126
243	35	35	14.500	23	\N	0	2026-01-26 13:45:10.675991
244	35	46	270.000	16	\N	1	2026-01-26 13:45:10.675994
245	35	36	1.000	17	\N	2	2026-01-26 13:45:10.675996
246	35	39	1.000	17	\N	3	2026-01-26 13:45:10.675997
247	36	35	14.500	23	\N	0	2026-01-26 13:46:49.117418
248	36	66	270.000	16	\N	1	2026-01-26 13:46:49.117421
249	36	36	1.000	17	\N	2	2026-01-26 13:46:49.117423
250	36	39	1.000	17	\N	3	2026-01-26 13:46:49.117424
251	37	35	14.500	23	\N	0	2026-01-26 13:50:28.809692
252	37	45	270.000	16	\N	1	2026-01-26 13:50:28.809695
57	8	35	14.500	23	\N	0	2026-01-12 11:03:24.047586
58	8	37	1.000	17	\N	1	2026-01-12 11:03:24.047589
59	8	39	1.000	17	\N	2	2026-01-12 11:03:24.04759
60	7	59	1.000	17	\N	0	2026-01-12 11:03:33.344591
61	7	40	1.000	17	\N	1	2026-01-12 11:03:33.344595
62	7	35	10.500	23	\N	2	2026-01-12 11:03:33.344596
253	37	36	1.000	17	\N	2	2026-01-26 13:50:28.809697
254	37	39	1.000	17	\N	3	2026-01-26 13:50:28.809698
260	30	35	10.500	23	\N	0	2026-01-27 15:30:41.765292
261	30	60	270.000	16	\N	1	2026-01-27 15:30:41.765294
262	30	36	1.000	17	\N	2	2026-01-27 15:30:41.765296
263	30	39	1.000	17	\N	3	2026-01-27 15:30:41.765297
264	30	25	20.000	16	\N	4	2026-01-27 15:30:41.765298
270	40	35	14.500	23	\N	0	2026-01-27 15:46:19.037856
271	40	65	140.000	16	\N	1	2026-01-27 15:46:19.037859
189	13	35	10.500	23	\N	0	2026-01-22 11:15:21.695682
190	13	28	270.000	16	\N	1	2026-01-22 11:15:21.695685
191	13	36	1.000	17	\N	2	2026-01-22 11:15:21.695687
192	13	39	1.000	17	\N	3	2026-01-22 11:15:21.695688
193	12	35	10.500	23	\N	0	2026-01-22 11:15:44.131722
194	12	28	180.000	16	\N	1	2026-01-22 11:15:44.131725
195	12	37	1.000	17	\N	2	2026-01-22 11:15:44.131727
196	12	39	1.000	17	\N	3	2026-01-22 11:15:44.131728
197	11	35	14.500	23	\N	0	2026-01-22 11:16:13.81578
198	11	28	270.000	16	\N	1	2026-01-22 11:16:13.815784
199	11	36	1.000	17	\N	2	2026-01-22 11:16:13.815786
200	11	39	1.000	17	\N	3	2026-01-22 11:16:13.815788
101	19	35	10.500	23	\N	0	2026-01-14 14:43:02.512341
102	19	45	140.000	16	\N	1	2026-01-14 14:43:02.512345
103	19	38	1.000	17	\N	2	2026-01-14 14:43:02.512347
104	19	40	1.000	17	\N	3	2026-01-14 14:43:02.512349
105	18	35	10.500	23	\N	0	2026-01-14 14:44:52.28018
106	18	66	140.000	16	\N	1	2026-01-14 14:44:52.280183
107	18	38	1.000	17	\N	2	2026-01-14 14:44:52.280185
108	18	40	1.000	17	\N	3	2026-01-14 14:44:52.280186
109	17	35	10.500	23	\N	0	2026-01-14 14:45:03.642913
110	17	46	140.000	16	\N	1	2026-01-14 14:45:03.642917
111	17	38	1.000	17	\N	2	2026-01-14 14:45:03.642919
112	17	40	1.000	17	\N	3	2026-01-14 14:45:03.642921
113	16	35	10.500	23	\N	0	2026-01-14 14:45:15.313203
114	16	67	140.000	16	\N	1	2026-01-14 14:45:15.313206
115	16	59	1.000	17	\N	2	2026-01-14 14:45:15.313207
116	16	40	1.000	17	\N	3	2026-01-14 14:45:15.313209
117	15	35	10.500	23	\N	0	2026-01-14 14:50:00.751436
118	15	65	140.000	16	\N	1	2026-01-14 14:50:00.751441
119	15	38	1.000	17	\N	2	2026-01-14 14:50:00.751443
120	15	40	1.000	17	\N	3	2026-01-14 14:50:00.751445
121	20	35	14.500	23	\N	0	2026-01-14 14:53:30.447421
122	20	65	180.000	16	\N	1	2026-01-14 14:53:30.447425
123	20	37	1.000	17	\N	2	2026-01-14 14:53:30.447426
124	20	39	1.000	17	\N	3	2026-01-14 14:53:30.447427
125	21	35	14.500	23	\N	0	2026-01-14 14:57:30.730999
126	21	67	180.000	16	\N	1	2026-01-14 14:57:30.731003
127	21	37	1.000	17	\N	2	2026-01-14 14:57:30.731004
128	21	39	1.000	17	\N	3	2026-01-14 14:57:30.731005
129	22	35	14.500	23	\N	0	2026-01-14 14:59:21.172976
130	22	46	180.000	16	\N	1	2026-01-14 14:59:21.172979
131	22	37	1.000	17	\N	2	2026-01-14 14:59:21.17298
132	22	39	1.000	17	\N	3	2026-01-14 14:59:21.172981
201	10	35	14.500	23	\N	0	2026-01-22 11:16:44.974104
202	10	28	180.000	16	\N	1	2026-01-22 11:16:44.974109
203	10	37	1.000	17	\N	2	2026-01-22 11:16:44.974111
204	10	39	1.000	17	\N	3	2026-01-22 11:16:44.974112
137	23	35	14.500	23	\N	0	2026-01-14 15:01:57.454006
138	23	66	180.000	16	\N	1	2026-01-14 15:01:57.45401
139	23	37	1.000	17	\N	2	2026-01-14 15:01:57.454012
140	23	39	1.000	17	\N	3	2026-01-14 15:01:57.454013
272	40	38	1.000	17	\N	2	2026-01-27 15:46:19.03786
273	40	40	1.000	17	\N	3	2026-01-27 15:46:19.037862
274	41	35	14.500	23	\N	0	2026-01-27 15:48:36.473322
275	41	67	140.000	16	\N	1	2026-01-27 15:48:36.473326
276	41	38	1.000	17	\N	2	2026-01-27 15:48:36.473327
277	41	40	1.000	17	\N	3	2026-01-27 15:48:36.473328
278	42	35	14.500	23	\N	0	2026-01-27 15:57:38.242124
279	42	46	140.000	16	\N	1	2026-01-27 15:57:38.242129
280	42	38	1.000	17	\N	2	2026-01-27 15:57:38.242131
281	42	40	1.000	17	\N	3	2026-01-27 15:57:38.242193
282	43	35	14.500	23	\N	0	2026-01-27 15:59:50.867995
283	43	66	140.000	16	\N	1	2026-01-27 15:59:50.867998
284	43	38	1.000	17	\N	2	2026-01-27 15:59:50.867999
285	43	40	1.000	17	\N	3	2026-01-27 15:59:50.868
286	44	35	14.500	23	\N	0	2026-01-27 16:01:31.683338
287	44	45	140.000	16	\N	1	2026-01-27 16:01:31.683342
288	44	38	1.000	17	\N	2	2026-01-27 16:01:31.683343
289	44	40	1.000	17	\N	3	2026-01-27 16:01:31.683345
290	38	35	14.500	23	\N	0	2026-01-27 16:03:10.31841
291	38	28	140.000	16	\N	1	2026-01-27 16:03:10.318414
292	38	38	1.000	17	\N	2	2026-01-27 16:03:10.318415
293	38	40	1.000	17	\N	3	2026-01-27 16:03:10.318416
294	39	35	10.500	23	\N	0	2026-01-27 16:03:21.568995
295	33	35	100.000	23	\N	0	2026-01-27 16:03:37.323234
296	45	35	14.500	23	\N	0	2026-01-28 06:53:42.193297
297	45	28	140.000	16	\N	1	2026-01-28 06:53:42.1933
298	45	68	30.000	23	\N	2	2026-01-28 06:53:42.193302
299	45	37	1.000	17	\N	3	2026-01-28 06:53:42.193304
300	45	39	1.000	17	\N	4	2026-01-28 06:53:42.193305
304	49	35	10.500	23	\N	0	2026-01-28 07:38:44.395223
305	49	28	110.000	16	\N	1	2026-01-28 07:38:44.395226
306	49	60	110.000	16	\N	2	2026-01-28 07:38:44.395227
307	49	37	1.000	17	\N	3	2026-01-28 07:38:44.395228
308	49	39	1.000	17	\N	4	2026-01-28 07:38:44.395229
309	49	29	4.000	32	\N	5	2026-01-28 07:38:44.39523
314	51	35	10.500	23	\N	0	2026-01-28 07:51:23.009543
315	51	28	180.000	16	\N	1	2026-01-28 07:51:23.009547
316	51	29	3.000	32	\N	2	2026-01-28 07:51:23.009549
317	51	25	20.000	16	\N	3	2026-01-28 07:51:23.009551
318	51	37	1.000	17	\N	4	2026-01-28 07:51:23.009553
319	51	39	1.000	17	\N	5	2026-01-28 07:51:23.009554
320	50	35	10.500	23	\N	0	2026-01-28 07:51:55.922534
321	50	28	180.000	16	\N	1	2026-01-28 07:51:55.922538
322	50	29	3.000	32	\N	2	2026-01-28 07:51:55.922539
323	50	25	20.000	16	\N	3	2026-01-28 07:51:55.92254
324	50	37	1.000	17	\N	4	2026-01-28 07:51:55.922541
325	50	39	1.000	17	\N	5	2026-01-28 07:51:55.922542
326	52	27	60.000	16	\N	0	2026-01-28 08:24:10.816772
327	52	37	1.000	17	\N	1	2026-01-28 08:24:10.816775
328	52	39	1.000	17	\N	2	2026-01-28 08:24:10.816776
329	53	27	1.000	16	\N	0	2026-01-28 08:24:47.92893
330	47	38	1.000	17	\N	0	2026-01-28 08:26:40.523812
331	48	29	1.000	23	\N	0	2026-01-28 08:27:01.294307
332	46	68	1.000	23	\N	0	2026-01-28 08:27:13.119786
333	29	60	1.000	16	\N	0	2026-01-28 08:27:27.555801
334	28	35	1.000	23	\N	0	2026-01-28 08:27:44.092826
335	27	28	1.000	16	\N	0	2026-01-28 08:27:56.852158
336	26	25	1.000	16	\N	0	2026-01-28 08:28:11.636892
337	54	35	14.500	23	\N	0	2026-01-28 08:52:47.94468
338	54	28	300.000	16	\N	1	2026-01-28 08:52:47.944684
339	54	70	1.000	17	\N	2	2026-01-28 08:52:47.944685
340	54	71	1.000	17	\N	3	2026-01-28 08:52:47.944686
341	54	69	100.000	23	\N	4	2026-01-28 08:52:47.944687
342	55	69	1.000	23	\N	0	2026-01-28 08:55:00.462955
343	56	35	10.500	23	\N	0	2026-01-28 09:03:43.239961
344	56	28	330.000	16	\N	1	2026-01-28 09:03:43.239965
345	56	70	1.000	17	\N	2	2026-01-28 09:03:43.239966
346	56	71	1.000	17	\N	3	2026-01-28 09:03:43.239967
347	56	69	100.000	23	\N	4	2026-01-28 09:03:43.239968
348	57	73	1.000	23	\N	0	2026-01-28 09:15:47.095907
349	58	72	1.000	23	\N	0	2026-01-28 09:17:34.680852
354	59	73	20.000	23	\N	0	2026-01-28 09:24:37.520515
355	59	37	1.000	17	\N	1	2026-01-28 09:24:37.520519
356	59	39	1.000	17	\N	2	2026-01-28 09:24:37.520521
357	59	28	270.000	16	\N	3	2026-01-28 09:24:37.520522
358	60	72	10.000	23	\N	0	2026-01-28 09:27:26.777876
359	60	28	270.000	16	\N	1	2026-01-28 09:27:26.777882
360	60	37	1.000	17	\N	2	2026-01-28 09:27:26.777884
361	60	39	1.000	17	\N	3	2026-01-28 09:27:26.777886
366	62	28	270.000	16	\N	0	2026-01-28 09:49:56.514379
367	62	73	10.000	23	\N	1	2026-01-28 09:49:56.514383
368	62	74	30.000	23	\N	2	2026-01-28 09:49:56.514384
369	62	37	1.000	17	\N	3	2026-01-28 09:49:56.514385
370	62	39	1.000	17	\N	4	2026-01-28 09:49:56.514386
371	63	75	1.000	23	\N	0	2026-01-28 09:57:36.099854
372	64	75	2.000	23	\N	0	2026-01-28 10:12:33.442169
373	64	37	1.000	17	\N	1	2026-01-28 10:12:33.442173
374	64	39	1.000	17	\N	2	2026-01-28 10:12:33.442175
375	64	76	1.000	17	\N	3	2026-01-28 10:12:33.442176
376	64	77	1.000	17	\N	4	2026-01-28 10:12:33.442178
377	65	28	60.000	16	\N	0	2026-01-28 10:13:42.801594
382	61	29	10.000	32	\N	0	2026-01-28 17:47:08.46173
383	61	37	1.000	17	\N	1	2026-01-28 17:47:08.461734
384	61	39	1.000	17	\N	2	2026-01-28 17:47:08.461736
385	61	28	270.000	16	\N	3	2026-01-28 17:47:08.461737
\.


--
-- Data for Name: tech_card_items; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.tech_card_items (id, business_id, name, description, selling_price, is_active, approval_status, approved_by, approved_at, created_by, created_at, updated_at) FROM stdin;
1	1	молоко	\N	150.00	t	approved	1	2026-01-04 13:02:39.943401	1	2026-01-04 13:01:32.454522	2026-01-04 13:02:39.944554
2	1	Капучино	\N	250.00	t	approved	1	2026-01-04 13:09:01.322307	1	2026-01-04 13:08:18.560293	2026-01-04 13:09:01.323885
20	3	Капучино 350мл на миндальном	\N	320.00	t	approved	2	2026-01-14 15:03:09.424592	2	2026-01-14 14:53:30.442855	2026-01-14 15:03:09.425105
21	3	Капучино 350мл на фундучном	\N	320.00	t	approved	2	2026-01-14 15:03:12.126316	2	2026-01-14 14:57:30.728082	2026-01-14 15:03:12.12674
22	3	Капучино 350мл на кокосовом	\N	320.00	t	approved	2	2026-01-14 15:03:14.476539	2	2026-01-14 14:59:21.171386	2026-01-14 15:03:14.476984
23	3	Капучино 350мл на банановом	\N	320.00	t	approved	2	2026-01-14 15:03:16.991983	2	2026-01-14 15:01:35.94618	2026-01-14 15:03:16.992438
6	3	Двойной эспрессо 60мл	\N	180.00	t	approved	2	2026-01-12 10:46:19.638731	2	2026-01-07 15:47:28.445222	2026-01-12 10:46:19.639229
5	3	Эспрессо 30мл	\N	140.00	t	approved	2	2026-01-12 10:46:22.017744	2	2026-01-07 15:40:38.821867	2026-01-12 10:46:22.018176
24	3	Капучино 350мл на безлактозном	\N	320.00	t	approved	2	2026-01-14 15:03:19.24212	2	2026-01-14 15:03:01.74487	2026-01-14 15:03:19.24256
9	3	Капучино 250мл	\N	190.00	t	approved	2	2026-01-12 10:49:48.777479	2	2026-01-12 10:49:42.762059	2026-01-12 10:49:48.778718
37	3	Капучино 450мл на безлактозном	\N	360.00	t	approved	2	2026-01-27 15:28:23.806497	2	2026-01-26 13:50:28.808126	2026-01-27 15:28:23.807238
36	3	Капучино 450мл на банановом	\N	350.00	t	approved	2	2026-01-27 15:28:26.660793	2	2026-01-26 13:46:49.115497	2026-01-27 15:28:26.661229
35	3	Капучино 450мл на кокосовом	\N	350.00	t	approved	2	2026-01-27 15:28:29.539569	2	2026-01-26 13:45:10.673666	2026-01-27 15:28:29.543993
34	3	Капучино 450мл на фундучном	\N	350.00	t	approved	2	2026-01-27 15:28:34.721258	2	2026-01-26 13:43:08.068986	2026-01-27 15:28:34.721693
56	3	Айс Латтэ	\N	290.00	t	draft	\N	\N	2	2026-01-28 09:03:43.238044	2026-01-28 09:03:43.238048
8	3	Американо 350мл	\N	190.00	t	approved	2	2026-01-12 11:03:59.679685	2	2026-01-12 10:46:09.496839	2026-01-12 11:03:59.683207
7	3	Американо 250мл	\N	160.00	t	approved	2	2026-01-12 11:04:03.401371	2	2026-01-08 13:53:34.534105	2026-01-12 11:04:03.401872
32	3	Молотый кофе 50гр	\N	250.00	t	approved	2	2026-01-27 15:29:45.466007	2	2026-01-26 13:05:46.672569	2026-01-27 15:29:45.466569
31	3	Капучино 450мл на миндальном	\N	350.00	t	approved	2	2026-01-27 15:29:50.015689	2	2026-01-26 13:04:55.792833	2026-01-27 15:29:50.016092
57	3	Какао хрутка 1 гр	\N	1.00	t	draft	\N	\N	2	2026-01-28 09:15:47.094157	2026-01-28 09:15:47.09416
58	3	Какао Золотой ярлык 1гр	\N	1.00	t	draft	\N	\N	2	2026-01-28 09:17:34.679103	2026-01-28 09:17:34.679107
59	3	Какао с сахаром 350мл	\N	200.00	t	draft	\N	\N	2	2026-01-28 09:23:42.795927	2026-01-28 09:23:42.795932
30	3	Раф 450мл	\N	350.00	t	draft	\N	\N	2	2026-01-26 11:33:58.416077	2026-01-27 15:30:41.763794
19	3	Капучино 250мл на безлактозном	\N	290.00	t	approved	2	2026-01-14 14:43:05.743014	2	2026-01-14 14:43:02.50872	2026-01-14 14:43:05.743475
13	3	Латте 450мл	\N	260.00	t	approved	2	2026-01-22 11:15:29.262747	2	2026-01-12 11:08:45.728682	2026-01-22 11:15:29.265181
40	3	Флэт Уайт 250мл на миндальном	\N	340.00	t	draft	\N	\N	2	2026-01-27 15:46:19.035588	2026-01-27 15:46:19.035592
12	3	Латте 350мл	\N	220.00	t	approved	2	2026-01-22 11:15:56.493028	2	2026-01-12 11:02:23.733929	2026-01-22 11:15:56.493562
41	3	Флэт Уайт 250мл на фундучном	\N	340.00	t	draft	\N	\N	2	2026-01-27 15:48:36.470484	2026-01-27 15:48:36.470489
18	3	Капучино 250мл на банановом	\N	280.00	t	approved	2	2026-01-14 14:50:08.72646	2	2026-01-14 14:40:59.039551	2026-01-14 14:50:08.727382
17	3	Капучино 250мл на кокосовом 	\N	280.00	t	approved	2	2026-01-14 14:50:11.483656	2	2026-01-14 14:35:34.684171	2026-01-14 14:50:11.484313
16	3	Капучино 250мл на фундучном 	\N	280.00	t	approved	2	2026-01-14 14:50:15.135366	2	2026-01-14 14:32:11.339945	2026-01-14 14:50:15.136044
15	3	Капучино 250мл на миндальном	\N	280.00	t	approved	2	2026-01-14 14:50:18.958291	2	2026-01-14 14:25:41.669264	2026-01-14 14:50:18.95914
11	3	Капучино 450мл	\N	250.00	t	approved	2	2026-01-22 11:16:20.447619	2	2026-01-12 10:56:18.436632	2026-01-22 11:16:20.448251
42	3	Флэт Уайт 250мл на кокосовом	\N	340.00	t	draft	\N	\N	2	2026-01-27 15:57:38.236496	2026-01-27 15:57:38.236502
43	3	Флэт Уайт 250мл на банановом	\N	340.00	t	draft	\N	\N	2	2026-01-27 15:59:50.866114	2026-01-27 15:59:50.866117
10	3	Капучино 350мл	\N	220.00	t	approved	2	2026-01-22 11:16:50.67769	2	2026-01-12 10:52:26.158253	2026-01-22 11:16:50.678796
44	3	Флэт Уайт 250мл на безлактозе	\N	350.00	t	draft	\N	\N	2	2026-01-27 16:01:31.679736	2026-01-27 16:01:31.679741
25	3	Раф 350мл	\N	300.00	t	draft	\N	\N	2	2026-01-25 16:07:48.439452	2026-01-26 06:19:10.63311
38	3	Флэт Уайт 250мл	\N	250.00	t	draft	\N	\N	2	2026-01-27 15:32:28.872147	2026-01-27 16:03:10.316742
39	3	доп. Эспрессо 30мл	\N	100.00	t	draft	\N	\N	2	2026-01-27 15:33:25.851132	2026-01-27 16:03:21.567311
33	3	молотый кофе 100гр	\N	450.00	t	draft	\N	\N	2	2026-01-26 13:08:05.066519	2026-01-27 16:03:37.321636
45	3	Гляссе 350мл	\N	250.00	t	draft	\N	\N	2	2026-01-28 06:53:42.190814	2026-01-28 06:53:42.190818
49	3	Мокко 350мл	\N	250.00	t	draft	\N	\N	2	2026-01-28 07:38:44.392394	2026-01-28 07:38:44.3924
50	3	Баунти 350мл	\N	290.00	t	draft	\N	\N	2	2026-01-28 07:49:05.392896	2026-01-28 07:49:05.3929
51	3	Сникерс 350мл	\N	290.00	t	draft	\N	\N	2	2026-01-28 07:51:23.006508	2026-01-28 07:51:23.006537
52	3	Глинтвейн 350мл	\N	240.00	t	draft	\N	\N	2	2026-01-28 08:24:10.813931	2026-01-28 08:24:10.813935
53	3	глинтвейн 1мл	\N	1.00	t	draft	\N	\N	2	2026-01-28 08:24:47.926019	2026-01-28 08:24:47.926028
47	3	стакан 250мл 1шт	\N	1.00	t	draft	\N	\N	2	2026-01-28 07:00:30.039317	2026-01-28 08:26:40.522039
48	3	Шоколадка альп гольд 1 долька	\N	1.00	t	draft	\N	\N	2	2026-01-28 07:16:19.406659	2026-01-28 08:27:01.292141
46	3	Мороженое ванильное ОКЕЙ 1 гр	\N	1.00	t	draft	\N	\N	2	2026-01-28 06:54:49.902347	2026-01-28 08:27:13.118296
29	3	сливки 1мл	\N	1.00	t	draft	\N	\N	2	2026-01-26 11:27:50.051216	2026-01-28 08:27:27.554618
28	3	Кофе 1 гр	\N	1.00	t	draft	\N	\N	2	2026-01-26 11:25:49.048109	2026-01-28 08:27:44.091512
27	3	молоко 1мл	\N	1.00	t	draft	\N	\N	2	2026-01-26 11:23:50.028235	2026-01-28 08:27:56.851081
26	3	Сироп 1мл	\N	1.00	t	draft	\N	\N	2	2026-01-26 11:20:42.960686	2026-01-28 08:28:11.635789
54	3	Айс капучино 450мл	\N	290.00	t	draft	\N	\N	2	2026-01-28 08:52:47.941403	2026-01-28 08:52:47.941409
55	3	лед 1гр	\N	1.00	t	draft	\N	\N	2	2026-01-28 08:55:00.461173	2026-01-28 08:55:00.461178
60	3	Какао без сахара 350мл	\N	200.00	t	draft	\N	\N	2	2026-01-28 09:27:26.773156	2026-01-28 09:27:26.773163
61	3	Горячий шоколад 350мл	\N	250.00	t	draft	\N	\N	2	2026-01-28 09:43:03.234456	2026-01-28 09:43:03.234459
62	3	Арахисовый какао 350мл	\N	290.00	t	draft	\N	\N	2	2026-01-28 09:49:56.51207	2026-01-28 09:49:56.512074
63	3	Чай черный 1гр	\N	1.00	t	draft	\N	\N	2	2026-01-28 09:57:36.098215	2026-01-28 09:57:36.098219
64	3	Чай черный 350мл	\N	120.00	t	draft	\N	\N	2	2026-01-28 10:12:33.439604	2026-01-28 10:12:33.439609
65	3	доп. молоко 60мл	\N	40.00	t	approved	2	2026-01-28 17:45:40.297953	2	2026-01-28 10:13:42.800158	2026-01-28 17:45:40.298584
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.units (id, name, symbol, unit_type, base_unit_id, conversion_factor, is_active, created_at, updated_at, business_id, description) FROM stdin;
1	миллилтр	мл.	volume	\N	1.0000	t	2025-11-15 20:59:59.858949	2025-11-15 21:01:43.645309	1	\N
2	Литр	л.	volume	1	1000.0000	t	2025-11-15 21:00:19.077091	2025-11-15 21:02:00.717137	1	\N
3	Ведро	шт.	volume	1	20000.0000	t	2025-11-15 21:01:02.617373	2025-11-15 21:02:08.716661	1	\N
4	Килограмм	кг	weight	\N	1.0000	t	2025-11-20 11:13:21.153109	2025-11-20 11:13:21.153113	2	\N
5	Литры	л	volume	\N	1.0000	t	2025-11-20 13:55:01.674978	2025-11-20 13:55:01.674986	2	\N
6	Литры	л	volume	5	1000.0000	t	2025-11-22 11:29:03.770337	2025-11-22 11:31:35.841829	2	\N
7	Литры	л	volume	5	700.0000	t	2025-11-22 11:32:52.198342	2025-11-22 11:32:52.198346	2	\N
8	Штука	шт	count	\N	1.0000	t	2025-11-23 11:48:12.762358	2025-11-23 11:48:12.762364	2	\N
9	Грамм	г	weight	\N	1.0000	t	2026-01-04 13:03:32.270318	2026-01-04 13:03:32.270322	1	\N
10	Килограмм	кг	weight	9	1000.0000	t	2026-01-04 13:03:56.814961	2026-01-04 13:03:56.814965	1	\N
11	Пачка (1кг)	шт	weight	9	1000.0000	t	2026-01-04 13:04:28.988645	2026-01-04 13:04:28.98865	1	\N
12	Ящик (25 пачек)	шт	weight	9	25000.0000	t	2026-01-04 13:05:08.907657	2026-01-04 13:05:08.907661	1	\N
13	Килограмм	кг	weight	\N	1.0000	t	2026-01-05 09:28:36.125927	2026-01-05 09:28:36.125931	3	Базовая единица веса
15	Литр	л	volume	\N	1.0000	t	2026-01-05 09:28:36.139303	2026-01-05 09:28:36.139307	3	Базовая единица объема
16	Миллилитр	мл	volume	15	0.0010	t	2026-01-05 09:28:36.142112	2026-01-05 09:28:36.142116	3	1 миллилитр = 0.001 литра
17	Штука	шт	count	\N	1.0000	t	2026-01-05 09:28:36.14482	2026-01-05 09:28:36.144825	3	Единица для подсчета штучных товаров
18	700 мл сиропы за бутылку	700 мл	volume	15	700.0000	t	2026-01-05 10:44:02.055881	2026-01-05 10:48:49.455099	3	\N
22	Ritter Sport 100гр	шт	weight	13	0.1000	t	2026-01-07 10:08:52.032573	2026-01-07 10:08:52.032577	3	\N
21	Корица	шт	weight	13	0.0150	t	2026-01-07 10:05:43.781813	2026-01-07 10:57:03.639452	3	\N
23	Граммы	г	weight	13	0.0010	t	2026-01-07 14:56:02.781853	2026-01-07 14:56:02.781857	3	\N
24	Килограмм	кг	weight	\N	1.0000	t	2026-01-07 15:01:24.645924	2026-01-07 15:01:24.645928	4	Базовая единица веса
25	Грамм	г	weight	24	0.0010	t	2026-01-07 15:01:24.648701	2026-01-07 15:01:24.648704	4	1 грамм = 0.001 килограмма
26	Литр	л	volume	\N	1.0000	t	2026-01-07 15:01:24.650581	2026-01-07 15:01:24.650584	4	Базовая единица объема
27	Миллилитр	мл	volume	26	0.0010	t	2026-01-07 15:01:24.652349	2026-01-07 15:01:24.652352	4	1 миллилитр = 0.001 литра
28	Штука	шт	count	\N	1.0000	t	2026-01-07 15:01:24.65404	2026-01-07 15:01:24.654042	4	Единица для подсчета штучных товаров
29	Миндаль жаренный 45гр	шт	weight	13	0.0045	t	2026-01-12 10:26:38.223195	2026-01-12 10:26:38.2232	3	\N
30	Сироп 20мл	порция	volume	15	0.0020	t	2026-01-12 11:28:06.676144	2026-01-12 11:28:06.676149	3	\N
31	Мороженное ванильное 800гр	800 гр	weight	13	0.8000	t	2026-01-28 06:48:36.796816	2026-01-28 06:48:36.79684	3	\N
19	Шоколадка Альпен гольд 80гр	шт	weight	13	0.0800	t	2026-01-07 10:00:22.01424	2026-01-28 07:14:31.161391	3	\N
32	1 долька шоколадки	шт	weight	13	0.0053	t	2026-01-28 07:33:06.347162	2026-01-28 07:33:06.347166	3	\N
33	Какао Золотой ярлык 100гр	шт	weight	13	0.1000	t	2026-01-28 09:10:53.417583	2026-01-28 09:10:53.417589	3	\N
34	Хрутка 250гр	шт	weight	13	0.2500	t	2026-01-28 09:13:46.971985	2026-01-28 09:13:46.971989	3	\N
35	Арахисовая паста 340гр	шт	weight	13	0.3400	t	2026-01-28 09:46:37.603464	2026-01-28 09:46:37.603469	3	\N
36	Черный чай 200гр	шт	weight	13	0.2000	t	2026-01-28 09:56:06.243599	2026-01-28 09:56:06.243603	3	\N
\.


--
-- Data for Name: user_businesses; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.user_businesses (user_id, business_id, role_in_business, is_active, created_at, updated_at) FROM stdin;
1	1	owner	t	2025-11-15 20:58:45.214215	2025-11-15 20:58:45.214222
2	2	owner	t	2025-11-17 17:11:39.615876	2025-11-17 17:11:39.615878
2	3	owner	t	2026-01-05 09:28:36.121306	2026-01-05 09:28:36.12131
1	4	owner	t	2026-01-07 15:01:24.642864	2026-01-07 15:01:24.642866
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.user_permissions (id, user_id, permission_id, business_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: coffee_user
--

COPY public.users (id, email, password_hash, username, role_id, created_at, refresh_token, refresh_token_expires) FROM stdin;
2	konstantin.manilo@yandex.ru	$2b$12$XSJHHVRHpXSGQcOT/uCZw.X2PqLLXPEN3LAF2V2w9U8QwvyoeI.cy	Константин	3	2025-11-17 15:23:27.979656	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiaWF0IjoxNzY5NjIyMzI5LCJleHAiOjE3NzIyMTQzMjksInR5cGUiOiJyZWZyZXNoIn0.eqcqcPMWhMx-8HOjZUKgKkB7R440G9EOViACyVSwANI	2026-01-29 17:45:29.045512+00
1	vladimirsmirnov7@gmail.com	$2b$12$x.u9mVwwTbdNlEVXaZPG2eETVCfbl10KTnVW9dPISVTvp0O0WAKhi	Vladimir	3	2025-11-15 20:19:08.297964	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzY4OTQ2OTU2LCJleHAiOjE3NzE1Mzg5NTYsInR5cGUiOiJyZWZyZXNoIn0.M19v3rdbAejDcY6vCUpZPMCCRaERkEbw-Ms2xK6yehE	2026-01-21 22:09:16.511765+00
\.


--
-- Name: audit_trail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.audit_trail_id_seq', 1, false);


--
-- Name: businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.businesses_id_seq', 4, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 77, true);


--
-- Name: expense_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.expense_records_id_seq', 1, false);


--
-- Name: expense_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.expense_sections_id_seq', 17, true);


--
-- Name: ingredient_cost_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.ingredient_cost_history_id_seq', 206, true);


--
-- Name: inventory_balances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.inventory_balances_id_seq', 46, true);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.invoice_items_id_seq', 140, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.invoices_id_seq', 37, true);


--
-- Name: month_periods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.month_periods_id_seq', 4, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.permissions_id_seq', 57, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 125, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- Name: starting_inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.starting_inventory_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 14, true);


--
-- Name: tech_card_item_ingredients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.tech_card_item_ingredients_id_seq', 385, true);


--
-- Name: tech_card_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.tech_card_items_id_seq', 65, true);


--
-- Name: units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.units_id_seq', 36, true);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.user_permissions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: coffee_user
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_trail audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.audit_trail
    ADD CONSTRAINT audit_trail_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expense_records expense_records_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_records
    ADD CONSTRAINT expense_records_pkey PRIMARY KEY (id);


--
-- Name: expense_sections expense_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_sections
    ADD CONSTRAINT expense_sections_pkey PRIMARY KEY (id);


--
-- Name: ingredient_cost_history ingredient_cost_history_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.ingredient_cost_history
    ADD CONSTRAINT ingredient_cost_history_pkey PRIMARY KEY (id);


--
-- Name: inventory_balances inventory_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.inventory_balances
    ADD CONSTRAINT inventory_balances_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: month_periods month_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.month_periods
    ADD CONSTRAINT month_periods_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: starting_inventory starting_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.starting_inventory
    ADD CONSTRAINT starting_inventory_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tech_card_item_ingredients tech_card_item_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_item_ingredients
    ADD CONSTRAINT tech_card_item_ingredients_pkey PRIMARY KEY (id);


--
-- Name: tech_card_items tech_card_items_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_items
    ADD CONSTRAINT tech_card_items_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: starting_inventory uq_starting_inventory_business_category_date; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.starting_inventory
    ADD CONSTRAINT uq_starting_inventory_business_category_date UNIQUE (business_id, category_id, inventory_date);


--
-- Name: user_businesses user_businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.user_businesses
    ADD CONSTRAINT user_businesses_pkey PRIMARY KEY (user_id, business_id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_audit_trail_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_audit_trail_id ON public.audit_trail USING btree (id);


--
-- Name: ix_businesses_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_businesses_id ON public.businesses USING btree (id);


--
-- Name: ix_businesses_name; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_businesses_name ON public.businesses USING btree (name);


--
-- Name: ix_expense_categories_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_expense_categories_id ON public.expense_categories USING btree (id);


--
-- Name: ix_expense_records_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_expense_records_id ON public.expense_records USING btree (id);


--
-- Name: ix_expense_sections_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_expense_sections_id ON public.expense_sections USING btree (id);


--
-- Name: ix_ingredient_cost_category_date; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_ingredient_cost_category_date ON public.ingredient_cost_history USING btree (category_id, purchase_date);


--
-- Name: ix_ingredient_cost_history_category_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_ingredient_cost_history_category_id ON public.ingredient_cost_history USING btree (category_id);


--
-- Name: ix_ingredient_cost_history_purchase_date; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_ingredient_cost_history_purchase_date ON public.ingredient_cost_history USING btree (purchase_date);


--
-- Name: ix_inventory_balances_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_inventory_balances_id ON public.inventory_balances USING btree (id);


--
-- Name: ix_invoice_items_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_invoice_items_id ON public.invoice_items USING btree (id);


--
-- Name: ix_invoices_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_invoices_id ON public.invoices USING btree (id);


--
-- Name: ix_month_periods_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_month_periods_id ON public.month_periods USING btree (id);


--
-- Name: ix_starting_inventory_business_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_starting_inventory_business_id ON public.starting_inventory USING btree (business_id);


--
-- Name: ix_suppliers_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_suppliers_id ON public.suppliers USING btree (id);


--
-- Name: ix_tech_card_item_ingredients_item_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_tech_card_item_ingredients_item_id ON public.tech_card_item_ingredients USING btree (item_id);


--
-- Name: ix_tech_card_items_business_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_tech_card_items_business_id ON public.tech_card_items USING btree (business_id);


--
-- Name: ix_tech_card_items_is_active; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_tech_card_items_is_active ON public.tech_card_items USING btree (is_active);


--
-- Name: ix_units_id; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE INDEX ix_units_id ON public.units USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: coffee_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: audit_trail audit_trail_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.audit_trail
    ADD CONSTRAINT audit_trail_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: audit_trail audit_trail_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.audit_trail
    ADD CONSTRAINT audit_trail_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: businesses businesses_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: expense_categories expense_categories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: expense_categories expense_categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expense_categories expense_categories_default_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_default_unit_id_fkey FOREIGN KEY (default_unit_id) REFERENCES public.units(id);


--
-- Name: expense_categories expense_categories_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.expense_sections(id);


--
-- Name: expense_records expense_records_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_records
    ADD CONSTRAINT expense_records_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: expense_records expense_records_invoice_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_records
    ADD CONSTRAINT expense_records_invoice_item_id_fkey FOREIGN KEY (invoice_item_id) REFERENCES public.invoice_items(id);


--
-- Name: expense_records expense_records_month_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_records
    ADD CONSTRAINT expense_records_month_period_id_fkey FOREIGN KEY (month_period_id) REFERENCES public.month_periods(id);


--
-- Name: expense_records expense_records_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_records
    ADD CONSTRAINT expense_records_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: expense_sections expense_sections_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_sections
    ADD CONSTRAINT expense_sections_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: expense_sections expense_sections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_sections
    ADD CONSTRAINT expense_sections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expense_records fk_expense_records_created_by_users; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.expense_records
    ADD CONSTRAINT fk_expense_records_created_by_users FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: invoices fk_invoices_created_by_users; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_invoices_created_by_users FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ingredient_cost_history ingredient_cost_history_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.ingredient_cost_history
    ADD CONSTRAINT ingredient_cost_history_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: ingredient_cost_history ingredient_cost_history_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.ingredient_cost_history
    ADD CONSTRAINT ingredient_cost_history_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE CASCADE;


--
-- Name: ingredient_cost_history ingredient_cost_history_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.ingredient_cost_history
    ADD CONSTRAINT ingredient_cost_history_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: ingredient_cost_history ingredient_cost_history_invoice_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.ingredient_cost_history
    ADD CONSTRAINT ingredient_cost_history_invoice_item_id_fkey FOREIGN KEY (invoice_item_id) REFERENCES public.invoice_items(id) ON DELETE CASCADE;


--
-- Name: ingredient_cost_history ingredient_cost_history_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.ingredient_cost_history
    ADD CONSTRAINT ingredient_cost_history_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;


--
-- Name: inventory_balances inventory_balances_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.inventory_balances
    ADD CONSTRAINT inventory_balances_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: inventory_balances inventory_balances_month_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.inventory_balances
    ADD CONSTRAINT inventory_balances_month_period_id_fkey FOREIGN KEY (month_period_id) REFERENCES public.month_periods(id);


--
-- Name: inventory_balances inventory_balances_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.inventory_balances
    ADD CONSTRAINT inventory_balances_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: invoice_items invoice_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoice_items invoice_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: invoices invoices_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: invoices invoices_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: month_periods month_periods_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.month_periods
    ADD CONSTRAINT month_periods_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: starting_inventory starting_inventory_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.starting_inventory
    ADD CONSTRAINT starting_inventory_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: starting_inventory starting_inventory_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.starting_inventory
    ADD CONSTRAINT starting_inventory_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE CASCADE;


--
-- Name: starting_inventory starting_inventory_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.starting_inventory
    ADD CONSTRAINT starting_inventory_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: starting_inventory starting_inventory_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.starting_inventory
    ADD CONSTRAINT starting_inventory_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;


--
-- Name: suppliers suppliers_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: suppliers suppliers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tech_card_item_ingredients tech_card_item_ingredients_ingredient_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_item_ingredients
    ADD CONSTRAINT tech_card_item_ingredients_ingredient_category_id_fkey FOREIGN KEY (ingredient_category_id) REFERENCES public.expense_categories(id) ON DELETE RESTRICT;


--
-- Name: tech_card_item_ingredients tech_card_item_ingredients_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_item_ingredients
    ADD CONSTRAINT tech_card_item_ingredients_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.tech_card_items(id) ON DELETE CASCADE;


--
-- Name: tech_card_item_ingredients tech_card_item_ingredients_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_item_ingredients
    ADD CONSTRAINT tech_card_item_ingredients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;


--
-- Name: tech_card_items tech_card_items_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_items
    ADD CONSTRAINT tech_card_items_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tech_card_items tech_card_items_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_items
    ADD CONSTRAINT tech_card_items_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: tech_card_items tech_card_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.tech_card_items
    ADD CONSTRAINT tech_card_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: units units_base_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_base_unit_id_fkey FOREIGN KEY (base_unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: units units_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: user_businesses user_businesses_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.user_businesses
    ADD CONSTRAINT user_businesses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: user_businesses user_businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.user_businesses
    ADD CONSTRAINT user_businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_permissions user_permissions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: coffee_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ZJpIWuSJqref3520m8T96nPC0epZdc16XIYYPyvir6uuEw1TfvP9WA45Ekd5gxV

