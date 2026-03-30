--
-- PostgreSQL database dump
--

\restrict wUCONIhV5HzxHuVPwj75APM1mbJdS1WkFAezQZaLJSqmTC2XL3PUei9Bdr0KuQ3

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Name: builders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.builders (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    contact_name character varying(100),
    office_phone character varying(20),
    active boolean,
    cell_phone character varying(20),
    fax character varying(20),
    email character varying(200),
    address character varying(200),
    city character varying(100),
    state character(2),
    zip_code character varying(15)
);


ALTER TABLE public.builders OWNER TO postgres;

--
-- Name: builders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.builders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.builders_id_seq OWNER TO postgres;

--
-- Name: builders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.builders_id_seq OWNED BY public.builders.id;


--
-- Name: counties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.counties (
    id integer NOT NULL,
    code character varying(6) NOT NULL,
    name character varying(100) NOT NULL,
    state character varying(2) NOT NULL,
    permit_fee_notes text,
    mech_permit_required text,
    inspection_notes text
);


ALTER TABLE public.counties OWNER TO postgres;

--
-- Name: counties_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.counties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.counties_id_seq OWNER TO postgres;

--
-- Name: counties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.counties_id_seq OWNED BY public.counties.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    doc_type character varying(30) NOT NULL,
    storage_path character varying(500),
    generated_at timestamp without time zone DEFAULT now(),
    notes text
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: draws; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.draws (
    id integer NOT NULL,
    house_type_id integer NOT NULL,
    stage character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    draw_number smallint NOT NULL
);


ALTER TABLE public.draws OWNER TO postgres;

--
-- Name: draws_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.draws_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.draws_id_seq OWNER TO postgres;

--
-- Name: draws_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.draws_id_seq OWNED BY public.draws.id;


--
-- Name: equipment_components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment_components (
    id integer NOT NULL,
    system_id integer NOT NULL,
    sort_order integer NOT NULL,
    component_type character varying(60) NOT NULL,
    model_number character varying(100),
    cost numeric(10,2)
);


ALTER TABLE public.equipment_components OWNER TO postgres;

--
-- Name: equipment_components_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipment_components_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_components_id_seq OWNER TO postgres;

--
-- Name: equipment_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipment_components_id_seq OWNED BY public.equipment_components.id;


--
-- Name: equipment_manufacturers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment_manufacturers (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.equipment_manufacturers OWNER TO postgres;

--
-- Name: equipment_manufacturers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipment_manufacturers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_manufacturers_id_seq OWNER TO postgres;

--
-- Name: equipment_manufacturers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipment_manufacturers_id_seq OWNED BY public.equipment_manufacturers.id;


--
-- Name: equipment_systems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment_systems (
    id integer NOT NULL,
    manufacturer_id integer NOT NULL,
    system_code character varying(40) NOT NULL,
    description text NOT NULL,
    component_cost numeric(10,2) NOT NULL,
    bid_price numeric(10,2) NOT NULL,
    effective_date date NOT NULL,
    retired_date date
);


ALTER TABLE public.equipment_systems OWNER TO postgres;

--
-- Name: equipment_systems_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipment_systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_systems_id_seq OWNER TO postgres;

--
-- Name: equipment_systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipment_systems_id_seq OWNED BY public.equipment_systems.id;


--
-- Name: event_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_log (
    id integer NOT NULL,
    event_at timestamp without time zone DEFAULT now(),
    username character varying(50),
    plan_id integer,
    event_type character varying(50),
    description text NOT NULL
);


ALTER TABLE public.event_log OWNER TO postgres;

--
-- Name: event_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_log_id_seq OWNER TO postgres;

--
-- Name: event_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_log_id_seq OWNED BY public.event_log.id;


--
-- Name: house_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.house_types (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    house_number character varying(2),
    name character varying(100) NOT NULL,
    bid_hours numeric(6,2),
    pwk_sheet_metal numeric(10,2),
    total_bid numeric(10,2),
    notes text
);


ALTER TABLE public.house_types OWNER TO postgres;

--
-- Name: house_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.house_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.house_types_id_seq OWNER TO postgres;

--
-- Name: house_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.house_types_id_seq OWNED BY public.house_types.id;


--
-- Name: kit_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kit_items (
    id integer NOT NULL,
    category character varying(50) NOT NULL,
    description character varying(200) NOT NULL,
    base_price numeric(10,2) NOT NULL,
    price_per_ton numeric(10,2) NOT NULL,
    unit character varying(20),
    sort_order integer,
    active boolean
);


ALTER TABLE public.kit_items OWNER TO postgres;

--
-- Name: kit_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kit_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kit_items_id_seq OWNER TO postgres;

--
-- Name: kit_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kit_items_id_seq OWNED BY public.kit_items.id;


--
-- Name: line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.line_items (
    id integer NOT NULL,
    system_id integer NOT NULL,
    sort_order character varying(10) NOT NULL,
    pricing_flag character varying(10),
    description text NOT NULL,
    quantity numeric(8,2),
    unit_price numeric(10,2),
    pwk_price numeric(10,2),
    draw_stage character varying(20),
    part_number character varying(40),
    notes text
);


ALTER TABLE public.line_items OWNER TO postgres;

--
-- Name: line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.line_items_id_seq OWNER TO postgres;

--
-- Name: line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.line_items_id_seq OWNED BY public.line_items.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id integer NOT NULL,
    plan_number character varying(12) NOT NULL,
    estimator_name character varying(100) NOT NULL,
    estimator_initials character varying(3) NOT NULL,
    project_id integer NOT NULL,
    status character varying(20),
    number_of_zones smallint,
    house_type character varying(100),
    notes text,
    contracted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plans_id_seq OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    builder_id integer NOT NULL,
    county_id integer,
    active boolean
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: suggestions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suggestions (
    id integer NOT NULL,
    submitted_at timestamp without time zone DEFAULT now(),
    user_id integer,
    user_name character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    subject character varying(200) NOT NULL,
    message text NOT NULL,
    status character varying(20)
);


ALTER TABLE public.suggestions OWNER TO postgres;

--
-- Name: suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suggestions_id_seq OWNER TO postgres;

--
-- Name: suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suggestions_id_seq OWNED BY public.suggestions.id;


--
-- Name: systems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.systems (
    id integer NOT NULL,
    house_type_id integer NOT NULL,
    system_number character varying(2),
    zone_label character varying(50),
    equipment_system_id integer,
    notes text
);


ALTER TABLE public.systems OWNER TO postgres;

--
-- Name: systems_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.systems_id_seq OWNER TO postgres;

--
-- Name: systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.systems_id_seq OWNED BY public.systems.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    full_name character varying(100) NOT NULL,
    initials character varying(3) NOT NULL,
    email character varying(200),
    hashed_password character varying(200) NOT NULL,
    role character varying(20) NOT NULL,
    active boolean,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: builders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builders ALTER COLUMN id SET DEFAULT nextval('public.builders_id_seq'::regclass);


--
-- Name: counties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counties ALTER COLUMN id SET DEFAULT nextval('public.counties_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: draws id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.draws ALTER COLUMN id SET DEFAULT nextval('public.draws_id_seq'::regclass);


--
-- Name: equipment_components id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_components ALTER COLUMN id SET DEFAULT nextval('public.equipment_components_id_seq'::regclass);


--
-- Name: equipment_manufacturers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_manufacturers ALTER COLUMN id SET DEFAULT nextval('public.equipment_manufacturers_id_seq'::regclass);


--
-- Name: equipment_systems id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_systems ALTER COLUMN id SET DEFAULT nextval('public.equipment_systems_id_seq'::regclass);


--
-- Name: event_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_log ALTER COLUMN id SET DEFAULT nextval('public.event_log_id_seq'::regclass);


--
-- Name: house_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.house_types ALTER COLUMN id SET DEFAULT nextval('public.house_types_id_seq'::regclass);


--
-- Name: kit_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kit_items ALTER COLUMN id SET DEFAULT nextval('public.kit_items_id_seq'::regclass);


--
-- Name: line_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.line_items ALTER COLUMN id SET DEFAULT nextval('public.line_items_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: suggestions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suggestions ALTER COLUMN id SET DEFAULT nextval('public.suggestions_id_seq'::regclass);


--
-- Name: systems id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.systems ALTER COLUMN id SET DEFAULT nextval('public.systems_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: builders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.builders (id, code, name, contact_name, office_phone, active, cell_phone, fax, email, address, city, state, zip_code) FROM stdin;
2831	RYAN	Ryan Homes	David Mercer	703-555-0101	t	703-555-0201	\N	dmercer@ryanhomes.com	11700 Plaza America Dr	Reston	VA	20190
2832	STANLEY	Stanley Martin Homes	Carol Whitfield	571-555-0102	t	571-555-0202	\N	cwhitfield@stanleymartin.com	11790 Sunrise Valley Dr	Reston	VA	20191
2833	TOLL	Toll Brothers	James Overton	202-555-0103	t	202-555-0303	\N	joverton@tollbrothers.com	1140 Connecticut Ave NW	Washington	DC	20036
2834	HOVNAN	K. Hovnanian Homes	Susan Park	410-555-0104	t	410-555-0404	\N	spark@khov.com	100 First Stamp Ct	Hunt Valley	MD	21030
2835	MILLER	Miller & Smith Homes	Robert Graves	703-555-0105	t	703-555-0505	\N	rgraves@millersmith.com	8401 Connecticut Ave	Chevy Chase	MD	20815
2836	BROOKFLD	Brookfield Residential	Angela Torres	240-555-0106	t	240-555-0606	\N	atorres@brookfield.com	7501 Wisconsin Ave	Bethesda	MD	20814
2837	MARONDA	Maronda Homes	Kevin Stills	614-555-0107	t	614-555-0707	\N	kstills@marondahomes.com	5000 Bradenton Ave	Dublin	OH	43017
2838	CRAFTSTR	Craftstar Homes	Diane Fowler	540-555-0108	t	540-555-0808	\N	dfowler@craftstarhomes.com	2201 Libbie Ave	Richmond	VA	23230
2839	NEXTHOME	NexHome Communities	Marcus Bell	804-555-0109	t	804-555-0909	\N	mbell@nexthome.com	4810 Sadler Rd	Glen Allen	VA	23060
2840	EASTWOOD	Eastwood Homes	Patricia Hale	704-555-0110	t	704-555-1010	\N	phale@eastwoodhomes.com	3321 Pineville Rd	Charlotte	NC	28210
2841	DREES	Drees Homes	Craig Nolan	513-555-0111	t	513-555-1111	\N	cnolan@dreeshomes.com	211 Grandview Dr	Fort Mitchell	KY	41017
2842	CENTEX	Centex Homes	Nancy Caldwell	615-555-0112	t	615-555-1212	\N	ncaldwell@centex.com	500 James Robertson Pkwy	Nashville	TN	37219
2843	MAINVUE	MainVue Homes	Ethan Reyes	425-555-0113	t	425-555-1313	\N	ereyes@mainvuehomes.com	1201 Monster Rd SW	Renton	WA	98057
2844	ROONEY	Rooney & Associates	Linda Chu	703-555-0114	t	703-555-1414	\N	lchu@rooneyassoc.com	8300 Boone Blvd	Vienna	VA	22182
2845	MERIDIAN	Meridian Builders Group	Scott Vance	301-555-0115	t	301-555-1515	\N	svance@meridianbuilders.com	1 Bethesda Metro Ctr	Bethesda	MD	20814
2846	SUNRIDGE	Sunridge Development	Alice Monroe	540-555-0116	t	540-555-1616	\N	amonroe@sunridgedev.com	300 Garrisonville Rd	Stafford	VA	22554
2847	PATRIOT	Patriot Homes Inc	Brian Kelly	571-555-0117	t	571-555-1717	\N	bkelly@patriothomes.com	9990 Fairfax Blvd	Fairfax	VA	22030
2848	LEGACY	Legacy Custom Homes	Jennifer Nash	804-555-0118	t	804-555-1818	\N	jnash@legacycustomhomes.com	2600 Buford Rd	Richmond	VA	23235
2849	PRIMUS	Primus Builders	Tom Garrett	410-555-0119	t	410-555-1919	\N	tgarrett@primusbuilders.com	1954 Greenspring Dr	Timonium	MD	21093
2850	SUMMIT	Summit Construction Group	Carla Dixon	703-555-0120	t	703-555-2020	\N	cdixon@summitconst.com	12110 Sunset Hills Rd	Reston	VA	20190
2851	VICTORY	Victory Homes LLC	Daniel Wu	540-555-0121	t	540-555-2121	\N	dwu@victoryhomesllc.com	100 Market St	Harrisonburg	VA	22801
2852	CHESAPK	Chesapeake Development Co	Megan Powell	410-555-0122	t	410-555-2222	\N	mpowell@chesapeakedev.com	2 Hamill Rd	Baltimore	MD	21210
2853	STONEBRG	Stonebridge Homes	Ryan Jacobs	703-555-0123	t	703-555-2323	\N	rjacobs@stonebridgehomes.com	13800 Coppermine Rd	Herndon	VA	20171
2854	FOXHALL	Foxhall Custom Builders	Kathryn Murray	301-555-0124	t	301-555-2424	\N	kmurray@foxhallbuilders.com	5530 Wisconsin Ave	Chevy Chase	MD	20815
2855	ANTHEM	Anthem Builders Inc	Steve Fisher	571-555-0125	t	571-555-2525	\N	sfisher@anthembuilders.com	2001 Edmund Halley Dr	Reston	VA	20191
2856	CLARIDGE	Claridge Homes	Amy Hoffman	410-555-0126	t	410-555-2626	\N	ahoffman@claridgehomes.com	500 York Rd	Towson	MD	21204
2857	HEARTLD	Heartland Communities	Mark Spencer	804-555-0127	t	804-555-2727	\N	mspencer@heartlandcomm.com	9020 Stony Point Pkwy	Richmond	VA	23235
2858	CRESTMNT	Crestmont Residential	Tara Fleming	703-555-0128	t	703-555-2828	\N	tfleming@crestmontres.com	8200 Greensboro Dr	McLean	VA	22102
2859	ASCENT	Ascent Homes	Chris Bond	571-555-0129	t	571-555-2929	\N	cbond@ascenthomes.com	11480 Commerce Park Dr	Reston	VA	20191
2860	KEYSTONE	Keystone Custom Homes	Laura West	717-555-0130	t	717-555-3030	\N	lwest@keystonecustom.com	276 Granite Run Dr	Lancaster	PA	17601
2861	HOMECRFT	HomeCraft Builders	Wayne Torres	540-555-0131	t	540-555-3131	\N	wtorres@homecraftbuilders.com	4100 Plank Rd	Fredericksburg	VA	22407
2862	NOVUSGRP	Novus Group Homes	Gail Henderson	301-555-0132	t	301-555-3232	\N	ghenderson@novusgrouphomes.com	14800 Sweitzer Ln	Laurel	MD	20707
2863	PINNACLE	Pinnacle Residential Group	Aaron Mills	703-555-0133	t	703-555-3333	\N	amills@pinnacleresidential.com	1600 Wilson Blvd	Arlington	VA	22209
2864	OAKMONT	Oakmont Development LLC	Pamela Scott	804-555-0134	t	804-555-3434	\N	pscott@oakmontdev.com	7201 Glen Forest Dr	Richmond	VA	23226
2865	CONCORD	Concord Builders Group	Frank Cooper	614-555-0135	t	614-555-3535	\N	fcooper@concordbuilders.com	300 Marconi Blvd	Columbus	OH	43215
2866	MADISON	Madison Homes Corp	Grace Kim	703-555-0136	t	703-555-3636	\N	gkim@madisonhomescorp.com	7700 Leesburg Pike	Falls Church	VA	22043
2867	HORIZON	Horizon Home Builders	Phil Andrews	757-555-0137	t	757-555-3737	\N	pandrews@horizonhb.com	999 Waterside Dr	Norfolk	VA	23510
2868	LANDMARK	Landmark Homes of Virginia	Sue Ramsey	540-555-0138	t	540-555-3838	\N	sramsey@landmarkhomesva.com	520 University Blvd	Harrisonburg	VA	22801
2869	BARRINGTON	Barrington Custom Homes	Neil Foster	301-555-0139	t	301-555-3939	\N	nfoster@barringtoncustomhomes.com	One Maryland Ave	Annapolis	MD	21401
2870	COLONIAL	Colonial Heritage Builders	Kim Larson	804-555-0140	t	804-555-4040	\N	klarson@colonialheritage.com	4801 Wesover Hills Blvd	Richmond	VA	23225
2871	WILLOW	Willow Creek Homes	Greg Simmons	540-555-0141	t	540-555-4141	\N	gsimmons@willowcreekhomes.com	1600 Emmet St N	Charlottesville	VA	22903
2872	EMERALD	Emerald Isle Builders	Donna Price	757-555-0142	t	757-555-4242	\N	dprice@emeraldislebuilders.com	600 22nd St	Virginia Beach	VA	23451
2873	BLUESTONE	Bluestone Development Corp	Ben Wallace	304-555-0143	t	304-555-4343	\N	bwallace@bluestonedev.com	600 Quarrier St	Charleston	WV	25301
2874	TRIDENT	Trident Custom Homes	Joan Barker	703-555-0144	t	703-555-4444	\N	jbarker@tridentcustomhomes.com	2000 Corporate Ridge Rd	McLean	VA	22102
2875	NORWOOD	Norwood Residential	Matt Owens	410-555-0145	t	410-555-4545	\N	mowens@norwoodresidential.com	120 E Baltimore St	Baltimore	MD	21202
2876	CROSSINGS	The Crossings Group	Rachel Dunn	571-555-0146	t	571-555-4646	\N	rdunn@thecrossingsgroup.com	1760 Reston Pkwy	Reston	VA	20190
2877	HARBORV	Harbor View Builders	Earl Quinn	757-555-0147	t	757-555-4747	\N	equinn@harborviewbuilders.com	4525 Main St	Virginia Beach	VA	23462
2878	ALPINE	Alpine Ridge Homes	Sara Conley	540-555-0148	t	540-555-4848	\N	sconley@alpineridgehomes.com	300 Arbor Dr	Blacksburg	VA	24060
2879	COPPERWD	Copperwood Custom Homes	Tim Harvey	703-555-0149	t	703-555-4949	\N	tharvey@copperwoodhomes.com	10400 Eaton Pl	Fairfax	VA	22030
2880	PRESTWICK	Prestwick Home Builders	Clare Moody	804-555-0150	t	804-555-5050	\N	cmoody@prestwickbuilders.com	2810 N Parham Rd	Richmond	VA	23294
2881	ASPEN	Aspen Communities	Nick Tanner	240-555-0151	t	240-555-5151	\N	ntanner@aspencommunities.com	6400 Goldsboro Rd	Bethesda	MD	20817
2882	CARDINAL	Cardinal Custom Builders	Vicki Lane	540-555-0152	t	540-555-5252	\N	vlane@cardinalbuilders.com	620 Caroline St	Fredericksburg	VA	22401
2883	IRONWOOD	Ironwood Development Group	Paul Steele	571-555-0153	t	571-555-5353	\N	psteele@ironwooddev.com	1900 Campus Commons Dr	Reston	VA	20191
2884	SADDLBRK	Saddlebrook Homes LLC	Mary Grant	804-555-0154	t	804-555-5454	\N	mgrant@saddlebrookhomes.com	6800 Paragon Pl	Richmond	VA	23230
2885	GENESIS	Genesis Home Builders	Larry Cross	703-555-0155	t	703-555-5555	\N	lcross@genesishomebuilders.com	11400 Commerce Park Dr	Reston	VA	20191
2886	FOXCROFT	Foxcroft Homes	Dana Rhodes	410-555-0156	t	410-555-5656	\N	drhodes@foxcrofthomes.com	600 Red Brook Blvd	Owings Mills	MD	21117
2887	WESTLAND	Westland Building Group	Roy Chambers	703-555-0157	t	703-555-5757	\N	rchambers@westlandbuilding.com	8270 Greensboro Dr	McLean	VA	22102
2888	CANOVA	Canova Construction Co	Anna Thornton	301-555-0158	t	301-555-5858	\N	athornton@canovaconstruction.com	15245 Shady Grove Rd	Rockville	MD	20850
2889	SUMMIT2	Summit View Homes	Dale Hicks	540-555-0159	t	540-555-5959	\N	dhicks@summitviewhomes.com	1600 Valley View Blvd	Roanoke	VA	24012
2890	LEGACY2	Legacy Ridge Development	Fran Meyer	804-555-0160	t	804-555-6060	\N	fmeyer@legacyridgedev.com	3950 University Blvd	Richmond	VA	23230
\.


--
-- Data for Name: counties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.counties (id, code, name, state, permit_fee_notes, mech_permit_required, inspection_notes) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, plan_id, doc_type, storage_path, generated_at, notes) FROM stdin;
24	3428	quote	../data/quotes\\Administrator\\AD0010326_quote.pdf	2026-03-26 11:16:29.584971	\N
25	3428	field_sheet	../data/quotes\\Administrator\\AD0010326_field_sheet.pdf	2026-03-26 11:18:18.216927	\N
\.


--
-- Data for Name: draws; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.draws (id, house_type_id, stage, amount, draw_number) FROM stdin;
196	3369	rough	999.54	1
197	3369	trim	999.54	2
198	3369	final	856.75	3
199	3370	rough	1133.06	1
200	3370	trim	1133.06	2
201	3370	final	971.19	3
202	3371	rough	3042.81	1
203	3371	trim	3042.81	2
204	3371	final	2608.12	3
205	3372	rough	3071.40	1
206	3372	trim	3071.40	2
207	3372	final	2632.63	3
208	3373	rough	1459.50	1
209	3373	trim	1459.50	2
210	3373	final	1251.00	3
211	3374	rough	971.54	1
212	3374	trim	971.54	2
213	3374	final	832.75	3
214	3375	rough	3115.28	1
215	3375	trim	3115.28	2
216	3375	final	2670.24	3
217	3376	rough	4127.95	1
218	3376	trim	4127.95	2
219	3376	final	3538.24	3
220	3377	rough	2105.04	1
221	3377	trim	2105.04	2
222	3377	final	1804.32	3
223	3378	rough	2010.19	1
224	3378	trim	2010.19	2
225	3378	final	1723.02	3
226	3379	rough	2422.42	1
227	3379	trim	2422.42	2
228	3379	final	2076.36	3
229	3380	rough	1243.51	1
230	3380	trim	1243.51	2
231	3380	final	1065.86	3
232	3381	rough	3455.30	1
233	3381	trim	3455.30	2
234	3381	final	2961.68	3
235	3382	rough	2631.29	1
236	3382	trim	2631.29	2
237	3382	final	2255.39	3
238	3383	rough	1639.15	1
239	3383	trim	1639.15	2
240	3383	final	1404.98	3
241	3384	rough	1191.25	1
242	3384	trim	1191.25	2
243	3384	final	1021.07	3
244	3385	rough	1490.52	1
245	3385	trim	1490.52	2
246	3385	final	1277.59	3
247	3386	rough	2960.41	1
248	3386	trim	2960.41	2
249	3386	final	2537.49	3
250	3387	rough	2641.41	1
251	3387	trim	2641.41	2
252	3387	final	2264.07	3
253	3388	rough	2133.89	1
254	3388	trim	2133.89	2
255	3388	final	1829.05	3
256	3389	rough	3748.26	1
257	3389	trim	3748.26	2
258	3389	final	3212.80	3
259	3390	rough	3171.23	1
260	3390	trim	3171.23	2
261	3390	final	2718.20	3
262	3391	rough	2403.43	1
263	3391	trim	2403.43	2
264	3391	final	2060.08	3
265	3392	rough	2349.04	1
266	3392	trim	2349.04	2
267	3392	final	2013.46	3
268	3393	rough	3017.52	1
269	3393	trim	3017.52	2
270	3393	final	2586.44	3
271	3394	rough	4076.35	1
272	3394	trim	4076.35	2
273	3394	final	3494.02	3
274	3395	rough	1267.86	1
275	3395	trim	1267.86	2
276	3395	final	1086.74	3
277	3396	rough	3148.37	1
278	3396	trim	3148.37	2
279	3396	final	2698.61	3
280	3397	rough	960.28	1
281	3397	trim	960.28	2
282	3397	final	823.10	3
283	3398	rough	1207.42	1
284	3398	trim	1207.42	2
285	3398	final	1034.93	3
286	3399	rough	2137.84	1
287	3399	trim	2137.84	2
288	3399	final	1832.43	3
289	3400	rough	2159.61	1
290	3400	trim	2159.61	2
291	3400	final	1851.10	3
292	3401	rough	3291.58	1
293	3401	trim	3291.58	2
294	3401	final	2821.36	3
295	3402	rough	2265.85	1
296	3402	trim	2265.85	2
297	3402	final	1942.15	3
298	3403	rough	2750.62	1
299	3403	trim	2750.62	2
300	3403	final	2357.67	3
301	3404	rough	3820.09	1
302	3404	trim	3820.09	2
303	3404	final	3274.36	3
304	3405	rough	1180.36	1
305	3405	trim	1180.36	2
306	3405	final	1011.74	3
307	3406	rough	3024.65	1
308	3406	trim	3024.65	2
309	3406	final	2592.56	3
310	3407	rough	3141.07	1
311	3407	trim	3141.07	2
312	3407	final	2692.35	3
313	3408	rough	3329.22	1
314	3408	trim	3329.22	2
315	3408	final	2853.62	3
316	3409	rough	3602.05	1
317	3409	trim	3602.05	2
318	3409	final	3087.47	3
319	3410	rough	3128.02	1
320	3410	trim	3128.02	2
321	3410	final	2681.16	3
322	3411	rough	3147.04	1
323	3411	trim	3147.04	2
324	3411	final	2697.46	3
325	3412	rough	2383.51	1
326	3412	trim	2383.51	2
327	3412	final	2043.01	3
328	3413	rough	2903.06	1
329	3413	trim	2903.06	2
330	3413	final	2488.34	3
331	3414	rough	3172.84	1
332	3414	trim	3172.84	2
333	3414	final	2719.57	3
334	3415	rough	2638.39	1
335	3415	trim	2638.39	2
336	3415	final	2261.48	3
337	3416	rough	2671.96	1
338	3416	trim	2671.96	2
339	3416	final	2290.25	3
340	3417	rough	1933.93	1
341	3417	trim	1933.93	2
342	3417	final	1657.65	3
343	3418	rough	884.42	1
344	3418	trim	884.42	2
345	3418	final	758.07	3
346	3419	rough	3636.79	1
347	3419	trim	3636.79	2
348	3419	final	3117.25	3
349	3420	rough	3524.30	1
350	3420	trim	3524.30	2
351	3420	final	3020.83	3
352	3421	rough	1718.67	1
353	3421	trim	1718.67	2
354	3421	final	1473.15	3
355	3422	rough	2872.79	1
356	3422	trim	2872.79	2
357	3422	final	2462.39	3
358	3423	rough	1488.18	1
359	3423	trim	1488.18	2
360	3423	final	1275.58	3
361	3424	rough	1788.45	1
362	3424	trim	1788.45	2
363	3424	final	1532.96	3
364	3425	rough	3212.85	1
365	3425	trim	3212.85	2
366	3425	final	2753.87	3
367	3426	rough	2889.54	1
368	3426	trim	2889.54	2
369	3426	final	2476.75	3
370	3427	rough	1944.29	1
371	3427	trim	1944.29	2
372	3427	final	1666.54	3
373	3428	rough	1242.53	1
374	3428	trim	1242.53	2
375	3428	final	1065.03	3
376	3429	rough	1165.12	1
377	3429	trim	1165.12	2
378	3429	final	998.67	3
379	3430	rough	2047.97	1
380	3430	trim	2047.97	2
381	3430	final	1755.40	3
382	3431	rough	4251.47	1
383	3431	trim	4251.47	2
384	3431	final	3644.11	3
385	3432	rough	1450.12	1
386	3432	trim	1450.12	2
387	3432	final	1242.96	3
388	3433	rough	2539.69	1
389	3433	trim	2539.69	2
390	3433	final	2176.88	3
391	3434	rough	3329.93	1
392	3434	trim	3329.93	2
393	3434	final	2854.22	3
394	3435	rough	2030.40	1
395	3435	trim	2030.40	2
396	3435	final	1740.34	3
397	3436	rough	3543.74	1
398	3436	trim	3543.74	2
399	3436	final	3037.49	3
400	3437	rough	1473.56	1
401	3437	trim	1473.56	2
402	3437	final	1263.05	3
403	3438	rough	1158.01	1
404	3438	trim	1158.01	2
405	3438	final	992.58	3
406	3439	rough	3628.10	1
407	3439	trim	3628.10	2
408	3439	final	3109.80	3
409	3440	rough	3650.77	1
410	3440	trim	3650.77	2
411	3440	final	3129.23	3
412	3441	rough	2790.84	1
413	3441	trim	2790.84	2
414	3441	final	2392.15	3
415	3442	rough	2020.03	1
416	3442	trim	2020.03	2
417	3442	final	1731.45	3
418	3443	rough	1217.24	1
419	3443	trim	1217.24	2
420	3443	final	1043.35	3
421	3444	rough	1716.80	1
422	3444	trim	1716.80	2
423	3444	final	1471.54	3
424	3445	rough	1299.84	1
425	3445	trim	1299.84	2
426	3445	final	1114.15	3
427	3446	rough	2447.55	1
428	3446	trim	2447.55	2
429	3446	final	2097.90	3
430	3447	rough	2037.04	1
431	3447	trim	2037.04	2
432	3447	final	1746.04	3
433	3448	rough	3592.73	1
434	3448	trim	3592.73	2
435	3448	final	3079.48	3
436	3449	rough	1198.61	1
437	3449	trim	1198.61	2
438	3449	final	1027.38	3
439	3450	rough	3667.26	1
440	3450	trim	3667.26	2
441	3450	final	3143.37	3
442	3451	rough	1975.04	1
443	3451	trim	1975.04	2
444	3451	final	1692.89	3
445	3452	rough	2090.77	1
446	3452	trim	2090.77	2
447	3452	final	1792.09	3
448	3453	rough	2597.15	1
449	3453	trim	2597.15	2
450	3453	final	2226.13	3
451	3454	rough	1372.02	1
452	3454	trim	1372.02	2
453	3454	final	1176.02	3
454	3455	rough	1519.93	1
455	3455	trim	1519.93	2
456	3455	final	1302.80	3
457	3456	rough	3403.38	1
458	3456	trim	3403.38	2
459	3456	final	2917.18	3
460	3457	rough	2564.51	1
461	3457	trim	2564.51	2
462	3457	final	2198.15	3
\.


--
-- Data for Name: equipment_components; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment_components (id, system_id, sort_order, component_type, model_number, cost) FROM stdin;
2464	3646	0	FER Furnace	58SB0B070M14 12	377.00
2465	3646	1	Upfl Coil txv	CVAVA3017XMA	218.00
2466	3646	2	Air Cond	GA5SAN53000W	815.00
2467	3647	0	FER Furnace	58SB0B090M21 16	389.00
2468	3647	1	Upfl Coil txv	CVAVA4224XMA	295.00
2469	3647	2	Air Cond	GA5SAN54200W	1066.00
2470	3648	0	FER Furnace	59SC2E040M14--12	563.00
2471	3648	1	Upfl Coil txv	CVAVA1814XMA	210.00
2472	3648	2	Air Cond	GA5SAN51800W	706.00
2473	3649	0	FER Furnace	59SC2E040M14--12	563.00
2474	3649	1	Upfl Coil txv	CVAVA2417XMA	225.00
2475	3649	2	Air Cond	GA5SAN52400W	721.00
2476	3650	0	FER Furnace	59SC2E040M14--12	563.00
2477	3650	1	Upfl Coil txv	CVAVA3017XMA	218.00
2478	3650	2	Air Cond	GA5SAN53000W	815.00
2479	3651	0	FER Furnace	59SC2E060M17--14	659.00
2480	3651	1	Upfl Coil txv	CVAVA2417XMA	225.00
2481	3651	2	Air Cond	GA5SAN52400W	721.00
2482	3652	0	FER Furnace	59SC2E060M17--14	659.00
2483	3652	1	Upfl Coil txv	CVAVA3017XMA	218.00
2484	3652	2	Air Cond	GA5SAN53000W	815.00
2485	3653	0	FER Furnace	59SC2E060M17--14	659.00
2486	3653	1	Upfl Coil txv	CVAVA4221XMA	264.00
2487	3653	2	Air Cond	GA5SAN53600W	851.00
2488	3654	0	FER Furnace	59SC2E080M17--16	672.00
2489	3654	1	Upfl Coil txv	CVAVA4221XMA	264.00
2490	3654	2	Air Cond	GA5SAN53600W	851.00
2491	3655	0	FER Furnace	59SC2E080M21--20	659.00
2492	3655	1	Upfl Coil txv	CVAVA4224XMA	295.00
2493	3655	2	Air Cond	GA5SAN54200W	1066.00
2494	3656	0	FER Furnace	59SC2E080M21--20	659.00
2495	3656	1	Upfl Coil txv	CVAVA4824XMA	309.00
2496	3656	2	Air Cond	GA5SAN54800W	1154.00
2497	3657	0	FER Furnace	59SC2E080M21--20	659.00
2498	3657	1	Upfl Coil txv	CVAVA6124XMA	391.00
2499	3657	2	Air Cond	GA5SAN56000W	1225.00
2500	3658	0	FER Furnace	59SC2E100M21--20	715.00
2501	3658	1	Upfl Coil txv	CVAVA4224XMA	295.00
2502	3658	2	Air Cond	GA5SAN54200W	1066.00
2503	3659	0	FER Furnace	59SC2E100M21--20	715.00
2504	3659	1	Upfl Coil txv	CVAVA4824XMA	309.00
2505	3659	2	Air Cond	GA5SAN54800W	1154.00
2506	3660	0	FER Furnace	59SC2E100M21--20	715.00
2507	3660	1	Upfl Coil txv	CVAVA6124XMA	391.00
2508	3660	2	Air Cond	GA5SAN56000W	1225.00
2509	3661	0	FER Furnace	59SC2E120M24--20	729.00
2510	3661	1	Upfl Coil txv	CVAVA4824XMA	309.00
2511	3661	2	Air Cond	GA5SAN54800W	1154.00
2512	3662	0	FER Furnace	59SC2E120M24--20	729.00
2513	3662	1	Upfl Coil txv	CVAVA6124XMA	391.00
2514	3662	2	Air Cond	GA5SAN56000W	1225.00
2515	3663	0	FER Furnace	FJ5ANXB24L00	474.00
2516	3663	1	Upfl Coil txv	FF-2401C05	130.00
2517	3663	2	Air Cond	GH5SAN51800A	969.00
2518	3664	0	FER Furnace	FJ5ANXB24L00	474.00
2519	3664	1	Upfl Coil txv	FF-2501C08	151.00
2520	3664	2	Air Cond	GH5SAN51800A	969.00
2521	3665	0	FER Furnace	FJ5ANXB24L00	474.00
2522	3665	1	Upfl Coil txv	FF-2601C10	159.00
2523	3665	2	Air Cond	GH5SAN51800A	969.00
2524	3666	0	FER Furnace	FJ5ANXB24L00	474.00
2525	3666	1	Upfl Coil txv	FF-2401C05	130.00
2526	3666	2	Air Cond	GH5SAN52400A	989.00
2527	3667	0	FER Furnace	FJ5ANXB24L00	474.00
2528	3667	1	Upfl Coil txv	FF-2501C08	151.00
2529	3667	2	Air Cond	GH5SAN52400A	989.00
2530	3668	0	FER Furnace	FJ5ANXB24L00	474.00
2531	3668	1	Upfl Coil txv	FF-2601C10	159.00
2532	3668	2	Air Cond	GH5SAN52400A	989.00
2533	3669	0	FER Furnace	FJ5ANXB24L00	474.00
2534	3669	1	Upfl Coil txv	FF-3101C15	260.00
2535	3669	2	Air Cond	GH5SAN52400A	989.00
2536	3670	0	FER Furnace	FJ5ANXB30L00	508.00
2537	3670	1	Upfl Coil txv	FF-2601C10	159.00
2538	3670	2	Air Cond	GH5SAN53000A	1106.00
2539	3671	0	FER Furnace	FJ5ANXB30L00	508.00
2540	3671	1	Upfl Coil txv	FF-3101C15	260.00
2541	3671	2	Air Cond	GH5SAN53000A	1106.00
2542	3672	0	FER Furnace	FJ5ANXB36L00	561.00
2543	3672	1	Upfl Coil txv	FF-2601C10	159.00
2544	3672	2	Air Cond	GH5SAN53600A	1239.00
2545	3673	0	FER Furnace	FJ5ANXB36L00	561.00
2546	3673	1	Upfl Coil txv	FF-3101C15	260.00
2547	3673	2	Air Cond	GH5SAN53600A	1239.00
2548	3674	0	FER Furnace	FJ5ANXB36L00	561.00
2549	3674	1	Upfl Coil txv	FF-3301C20	325.00
2550	3674	2	Air Cond	GH5SAN53600A	1239.00
2551	3675	0	FER Furnace	FJ5ANXC42L00	609.00
2552	3675	1	Upfl Coil txv	FF-2601C10	159.00
2553	3675	2	Air Cond	GH5SAN54200A	1358.00
2554	3676	0	FER Furnace	FJ5ANXC42L00	609.00
2555	3676	1	Upfl Coil txv	FF-3101C15	260.00
2556	3676	2	Air Cond	GH5SAN54200A	1358.00
2557	3677	0	FER Furnace	FJ5ANXC42L00	609.00
2558	3677	1	Upfl Coil txv	FF-3301C20	325.00
2559	3677	2	Air Cond	GH5SAN54200A	1358.00
2560	3678	0	FER Furnace	FJ5ANXC48L00	704.00
2561	3678	1	Upfl Coil txv	FF-3101C15	260.00
2562	3678	2	Air Cond	GH5SAN54800A	1407.00
2563	3679	0	FER Furnace	FJ5ANXC48L00	704.00
2564	3679	1	Upfl Coil txv	FF-3301C20	325.00
2565	3679	2	Air Cond	GH5SAN54800A	1407.00
2566	3680	0	FER Furnace	FJ5ANXD60L00	749.00
2567	3680	1	Upfl Coil txv	FF-3101C15	260.00
2568	3680	2	Air Cond	GH5SAN56000A	1582.00
2569	3681	0	FER Furnace	FJ5ANXD60L00	749.00
2570	3681	1	Upfl Coil txv	FF-3301C20	325.00
2571	3681	2	Air Cond	GH5SAN56000A	1582.00
2572	3682	0	FER Furnace	FJ5ANXB24L00	474.00
2573	3682	1	Upfl Coil txv	FF-2501C08	151.00
2574	3682	2	Air Cond	27SCA518A003	1395.00
2575	3683	0	FER Furnace	FJ5ANXB24L00	474.00
2576	3683	1	Upfl Coil txv	FF-2501C08	151.00
2577	3683	2	Air Cond	27SCA524A003	1446.00
2578	3684	0	FER Furnace	FJ5ANXB36L00	561.00
2579	3684	1	Upfl Coil txv	FF-2601C10	159.00
2580	3684	2	Air Cond	27SCA530A003	1658.00
2581	3685	0	FER Furnace	FJ5ANXB36L00	561.00
2582	3685	1	Upfl Coil txv	FF-3101C15	260.00
2583	3685	2	Air Cond	27SCA530A003	1658.00
2584	3686	0	FER Furnace	FJ5ANXB36L00	561.00
2585	3686	1	Upfl Coil txv	FF-2601C10	159.00
2586	3686	2	Air Cond	27SCA536A003	1787.00
2587	3687	0	FER Furnace	FT5ANXB24L00	1687.00
2588	3687	1	Upfl Coil txv	FF-2501C08	151.00
2589	3687	2	Air Cond	27SPA618003	1405.00
2590	3688	0	FER Furnace	FT5ANXB24L00	1687.00
2591	3688	1	Upfl Coil txv	FF-2501C08	151.00
2592	3688	2	Air Cond	27SPA624003	1459.00
2593	3689	0	FER Furnace	FT5ANXC36L00	1811.00
2594	3689	1	Upfl Coil txv	FF-2601C10	159.00
2595	3689	2	Air Cond	27SPA630003	1673.00
2596	3690	0	FER Furnace	FT5ANXC36L00	1811.00
2597	3690	1	Upfl Coil txv	FF-3101C15	260.00
2598	3690	2	Air Cond	27SPA630003	1673.00
2599	3691	0	FER Furnace	FT5ANXC36L00	1811.00
2600	3691	1	Upfl Coil txv	FF-2601C10	159.00
2601	3691	2	Air Cond	27SPA636003	1803.00
2602	3692	0	FER Furnace	59SC2E060M14--12	628.00
2603	3692	1	Upfl Coil txv	CAAMP2414AMA	339.00
2604	3692	2	Air Cond	27SCA518A003	1395.00
2605	3692	7	Component 8	TSTATXXSEN01-B	40.00
2606	3693	0	FER Furnace	59SC2E060M17--14	659.00
2607	3693	1	Upfl Coil txv	CAAMP2417AMA	348.00
2608	3693	2	Air Cond	27SCA524A003	1446.00
2609	3693	7	Component 8	TSTATXXSEN01-B	40.00
2610	3694	0	FER Furnace	59SC2E060M17--14	659.00
2611	3694	1	Upfl Coil txv	CAAMP3717AMA	496.00
2612	3694	2	Air Cond	27SCA530A003	1658.00
2613	3694	7	Component 8	TSTATXXSEN01-B	40.00
2614	3695	0	FER Furnace	59SC2E060M17--14	659.00
2615	3695	1	Upfl Coil txv	CAAMP4821AMA	459.00
2616	3695	2	Air Cond	27SCA536A003	1787.00
2617	3695	7	Component 8	TSTATXXSEN01-B	40.00
2618	3696	0	FER Furnace	59SC2E080M21--20	659.00
2619	3696	1	Upfl Coil txv	CAAMP6121AMA	507.00
2620	3696	2	Air Cond	27SCA542A003	2040.00
2621	3696	7	Component 8	TSTATXXSEN01-B	40.00
2622	3697	0	FER Furnace	59SC2E080M21--20	659.00
2623	3697	1	Upfl Coil txv	CAAMP6124AMA	620.00
2624	3697	2	Air Cond	27SCA548A003	2494.00
2625	3697	7	Component 8	TSTATXXSEN01-B	40.00
2626	3698	0	FER Furnace	59SC2E100M21--20	715.00
2627	3698	1	Upfl Coil txv	CAAMP6121AMA	507.00
2628	3698	2	Air Cond	27SCA542A003	2040.00
2629	3698	7	Component 8	TSTATXXSEN01-B	40.00
2630	3699	0	FER Furnace	59SC2E100M21--20	715.00
2631	3699	1	Upfl Coil txv	CAAMP6124AMA	620.00
2632	3699	2	Air Cond	27SCA548A003	2494.00
2633	3699	7	Component 8	TSTATXXSEN01-B	40.00
2634	3700	0	FER Furnace	59TP6C040V14 10	2041.00
2635	3700	1	Upfl Coil txv	CVAVA1814XMA	210.00
2636	3700	2	Air Cond	GA5SAN51800W	706.00
2637	3701	0	FER Furnace	59TP6C040V17 12	2073.00
2638	3701	1	Upfl Coil txv	CVAVA2417XMA	225.00
2639	3701	2	Air Cond	GA5SAN52400W	721.00
2640	3702	0	FER Furnace	59TP6C040V17 12	2073.00
2641	3702	1	Upfl Coil txv	CVAVA3017XMA	218.00
2642	3702	2	Air Cond	GA5SAN53000W	815.00
2643	3703	0	FER Furnace	59TP6C060V14 12	2115.00
2644	3703	1	Upfl Coil txv	CVAVA2514XMA	325.00
2645	3703	2	Air Cond	GA5SAN52400W	721.00
2646	3704	0	FER Furnace	59TP6C060V14 12	2115.00
2647	3704	1	Upfl Coil txv	CVAVA3017XMA	218.00
2648	3704	2	Air Cond	GA5SAN53000W	815.00
2649	3705	0	FER Furnace	59TP6C060V17 16	2126.00
2650	3705	1	Upfl Coil txv	CVAVA4221XMA	264.00
2651	3705	2	Air Cond	GA5SAN53600W	851.00
2652	3706	0	FER Furnace	59TP6C080V17 16	2145.00
2653	3706	1	Upfl Coil txv	CVAVA4221XMA	264.00
2654	3706	2	Air Cond	GA5SAN53600W	851.00
2655	3707	0	FER Furnace	59TP6C040V17 12	2073.00
2656	3707	1	Upfl Coil txv	CVAMA2517XMA	321.00
2657	3707	2	Air Cond	GA5SAN52400W	721.00
2658	3708	0	FER Furnace	59TP6C040V17 12	2073.00
2659	3708	1	Upfl Coil txv	CVAMA3017XMA	348.00
2660	3708	2	Air Cond	GA5SAN53000W	815.00
2661	3709	0	FER Furnace	59TP6C060V14 12	2115.00
2662	3709	1	Upfl Coil txv	CVAMA2517XMA	321.00
2663	3709	2	Air Cond	GA5SAN52400W	721.00
2664	3710	0	FER Furnace	59TP6C060V14 12	2115.00
2665	3710	1	Upfl Coil txv	CVAMA3017XMA	348.00
2666	3710	2	Air Cond	GA5SAN53000W	815.00
2667	3711	0	FER Furnace	59TP6C060V17 16	2126.00
2668	3711	1	Upfl Coil txv	CVAMA4221XMA	362.00
2669	3711	2	Air Cond	GA5SAN53600W	851.00
2670	3712	0	FER Furnace	59TP6C080V17 16	2145.00
2671	3712	1	Upfl Coil txv	CVAMA4221XMA	362.00
2672	3712	2	Air Cond	GA5SAN53600W	851.00
2673	3713	0	FER Furnace	59TP6C040V14 10	2041.00
2674	3713	1	Upfl Coil txv	CVAVA1814XMA	210.00
2675	3713	2	Air Cond	26SCA518W003	1121.00
2676	3714	0	FER Furnace	59TP6C040V17 12	2073.00
2677	3714	1	Upfl Coil txv	CVAVA2417XMA	225.00
2678	3714	2	Air Cond	26SCA524W003	1134.00
2679	3715	0	FER Furnace	59TP6C040V17 12	2073.00
2680	3715	1	Upfl Coil txv	CVAVA3017XMA	218.00
2681	3715	2	Air Cond	26SCA530W003	1277.00
2682	3716	0	FER Furnace	59TP6C060V14 12	2115.00
2683	3716	1	Upfl Coil txv	CVAVA2514XMA	325.00
2684	3716	2	Air Cond	26SCA524W003	1134.00
2685	3717	0	FER Furnace	59TP6C060V14 12	2115.00
2686	3717	1	Upfl Coil txv	CVAVA3017XMA	218.00
2687	3717	2	Air Cond	26SCA530W003	1277.00
2688	3718	0	FER Furnace	59TP6C060V17 16	2126.00
2689	3718	1	Upfl Coil txv	CVAVA4221XMA	264.00
2690	3718	2	Air Cond	26SCA536W003	1450.00
2691	3719	0	FER Furnace	59TP6C080V17 16	2145.00
2692	3719	1	Upfl Coil txv	CVAVA4221XMA	264.00
2693	3719	2	Air Cond	26SCA536W003	1450.00
2694	3720	0	FER Furnace	59TP6C040V17 12	2073.00
2695	3720	1	Upfl Coil txv	CVAMA2517XMA	321.00
2696	3720	2	Air Cond	26SCA524W003	1134.00
2697	3721	0	FER Furnace	59TP6C040V17 12	2073.00
2698	3721	1	Upfl Coil txv	CVAMA3017XMA	348.00
2699	3721	2	Air Cond	26SCA530W003	1277.00
2700	3722	0	FER Furnace	59TP6C060V14 12	2115.00
2701	3722	1	Upfl Coil txv	CVAMA2517XMA	321.00
2702	3722	2	Air Cond	26SCA524W003	1134.00
2703	3723	0	FER Furnace	59TP6C060V14 12	2115.00
2704	3723	1	Upfl Coil txv	CVAMA3017XMA	348.00
2705	3723	2	Air Cond	26SCA530W003	1277.00
2706	3724	0	FER Furnace	59TP6C060V17 16	2126.00
2707	3724	1	Upfl Coil txv	CVAMA4221XMA	362.00
2708	3724	2	Air Cond	26SCA536W003	1450.00
2709	3725	0	FER Furnace	59TP6C080V17 16	2145.00
2710	3725	1	Upfl Coil txv	CVAMA4221XMA	362.00
2711	3725	2	Air Cond	26SCA536W003	1450.00
2712	3726	0	FER Furnace	59TP6C040V14 10	2041.00
2713	3726	1	Upfl Coil txv	CVAVA1814XMA	210.00
2714	3726	2	Air Cond	26SPA618W003	2668.00
2715	3727	0	FER Furnace	59TP6C040V17 12	2073.00
2716	3727	1	Upfl Coil txv	CVAVA2417XMA	225.00
2717	3727	2	Air Cond	26SPA624W003	2750.00
2718	3728	0	FER Furnace	59TP6C040V17 12	2073.00
2719	3728	1	Upfl Coil txv	CVAVA3017XMA	218.00
2720	3728	2	Air Cond	26SPA630W003	3026.00
2721	3729	0	FER Furnace	59TP6C060V14 12	2115.00
2722	3729	1	Upfl Coil txv	CVAVA2514XMA	325.00
2723	3729	2	Air Cond	26SPA624W003	2750.00
2724	3730	0	FER Furnace	59TP6C060V14 12	2115.00
2725	3730	1	Upfl Coil txv	CVAVA3017XMA	218.00
2726	3730	2	Air Cond	26SPA630W003	3026.00
2727	3731	0	FER Furnace	59TP6C060V17 16	2126.00
2728	3731	1	Upfl Coil txv	CVAVA4221XMA	264.00
2729	3731	2	Air Cond	26SPA636W003	3315.00
2730	3732	0	FER Furnace	59TP6C080V17 16	2145.00
2731	3732	1	Upfl Coil txv	CVAVA4221XMA	264.00
2732	3732	2	Air Cond	26SPA636W003	3315.00
2733	3733	0	FER Furnace	59TP6C040V14 10	2041.00
2734	3733	1	Upfl Coil txv	CVAMA2414XMA	\N
2735	3733	2	Air Cond	26SPA618W003	2668.00
2736	3734	0	FER Furnace	59TP6C040V17 12	2073.00
2737	3734	1	Upfl Coil txv	CVAMA2517XMA	321.00
2738	3734	2	Air Cond	26SPA624W003	2750.00
2739	3735	0	FER Furnace	59TP6C040V17 12	2073.00
2740	3735	1	Upfl Coil txv	CVAMA3017XMA	348.00
2741	3735	2	Air Cond	26SPA630W003	3026.00
2742	3736	0	FER Furnace	59TP6C060V14 12	2115.00
2743	3736	1	Upfl Coil txv	CVAMA2517XMA	321.00
2744	3736	2	Air Cond	26SPA624W003	2750.00
2745	3737	0	FER Furnace	59TP6C060V14 12	2115.00
2746	3737	1	Upfl Coil txv	CVAMA3017XMA	348.00
2747	3737	2	Air Cond	26SPA630W003	3026.00
2748	3738	0	FER Furnace	59TP6C060V17 16	2126.00
2749	3738	1	Upfl Coil txv	CVAMA4221XMA	362.00
2750	3738	2	Air Cond	26SPA636W003	3315.00
2751	3739	0	FER Furnace	59TP6C080V17 16	2145.00
2752	3739	1	Upfl Coil txv	CVAMA4221XMA	362.00
2753	3739	2	Air Cond	26SPA636W003	3315.00
2754	3740	0	Furnace	N8MSN0451412A	283.00
2755	3740	1	Upfl N-Coil	END4X24L14	107.00
2756	3740	2	Air Cond	NXA424GKC	575.00
2757	3741	0	Furnace	N8MSN0451412A	283.00
2758	3741	1	Upfl N-Coil	END4X30L14	123.00
2759	3741	2	Air Cond	NXA430GKC	626.00
2760	3742	0	Furnace	N8MSN0451412A	283.00
2761	3742	1	Upfl N-Coil	END4X42L17	153.00
2762	3742	2	Air Cond	NXA436GKC	646.00
2763	3743	0	Furnace	N8MSN0701412A	289.00
2764	3743	1	Upfl N-Coil	END4X24L14	107.00
2765	3743	2	Air Cond	NXA424GKC	575.00
2766	3744	0	Furnace	N8MSN0701412A	289.00
2767	3744	1	Upfl N-Coil	END4X30L14	123.00
2768	3744	2	Air Cond	NXA430GKC	626.00
2769	3745	0	Furnace	N8MSN0701412A	289.00
2770	3745	1	Upfl N-Coil	END4X42L17	153.00
2771	3745	2	Air Cond	NXA436GKC	646.00
2772	3746	0	Furnace	N8MSN0701716A	295.00
2773	3746	1	Upfl N-Coil	END4X42L17	153.00
2774	3746	2	Air Cond	NXA436GKC	646.00
2775	3747	0	Furnace	N8MSN0701716A	295.00
2776	3747	1	Upfl N-Coil	END4X42L17	153.00
2777	3747	2	Air Cond	NXA442GKC	749.00
2778	3748	0	Furnace	N8MSN0701716A	295.00
2779	3748	1	Upfl N-Coil	END4X48L21	167.00
2780	3748	2	Air Cond	NXA448GKC	814.00
2781	3749	0	Furnace	N8MSN0901714B	319.00
2782	3749	1	Upfl N-Coil	END4X42L17	153.00
2783	3749	2	Air Cond	NXA436GKC	646.00
2784	3750	0	Furnace	N8MSN0901714B	319.00
2785	3750	1	Upfl N-Coil	END4X42L17	153.00
2786	3750	2	Air Cond	NXA442GKC	749.00
2787	3751	0	Furnace	N8MSN0902120A	343.00
2788	3751	1	Upfl N-Coil	END4X48L21	167.00
2789	3751	2	Air Cond	NXA448GKC	814.00
2790	3752	0	Furnace	N8MSN0902120A	343.00
2791	3752	1	Upfl N-Coil	END4X60L24	193.00
2792	3752	2	Air Cond	NXA460GKC	906.00
2793	3753	0	Furnace	N8MSN1102122A	361.00
2794	3753	1	Upfl N-Coil	END4X48L21	167.00
2795	3753	2	Air Cond	NXA448GKC	814.00
2796	3754	0	Furnace	N8MSN1102122A	361.00
2797	3754	1	Upfl N-Coil	END4X60L24	193.00
2798	3754	2	Air Cond	NXA460GKC	906.00
2799	3755	0	Furnace	N8MSN0701412A	289.00
2800	3755	1	Upfl N-Coil	ENH4X30L17	169.00
2801	3755	2	Air Cond	NXA430GKC	626.00
2802	3756	0	Furnace	N9MSB0401410C	464.00
2803	3756	1	Upfl N-Coil	END4X24L14	107.00
2804	3756	2	Air Cond	NXA418GKC	536.00
2805	3757	0	Furnace	N9MSB0401410C	464.00
2806	3757	1	Upfl N-Coil	END4X24L14	107.00
2807	3757	2	Air Cond	NXA424GKC	575.00
2808	3758	0	Furnace	N9MSB0401410C	464.00
2809	3758	1	Upfl N-Coil	END4X24L17	107.00
2810	3758	2	Air Cond	NXA424GKC	575.00
2811	3759	0	Furnace	N9MSB0601412C	502.00
2812	3759	1	Upfl N-Coil	END4X24L14	107.00
2813	3759	2	Air Cond	NXA424GKC	575.00
2814	3760	0	Furnace	N9MSB0601412C	502.00
2815	3760	1	Upfl N-Coil	END4X30L17	123.00
2816	3760	2	Air Cond	NXA424GKC	575.00
2817	3761	0	Furnace	N9MSB0601412C	502.00
2818	3761	1	Upfl N-Coil	END4X30L17	123.00
2819	3761	2	Air Cond	NXA430GKC	626.00
2820	3762	0	Furnace	N9MSB0601716C	505.00
2821	3762	1	Upfl N-Coil	END4X37L17	140.00
2822	3762	2	Air Cond	NXA430GKC	626.00
2823	3763	0	Furnace	N9MSB0601716C	505.00
2824	3763	1	Upfl N-Coil	END4X42L17	153.00
2825	3763	2	Air Cond	NXA436GKC	646.00
2826	3764	0	Furnace	N9MSB0601716C	505.00
2827	3764	1	Upfl N-Coil	END4X42L17	153.00
2828	3764	2	Air Cond	NXA442GKC	749.00
2829	3765	0	Furnace	N9MSB0801716C	534.00
2830	3765	1	Upfl N-Coil	END4X42L17	153.00
2831	3765	2	Air Cond	NXA436GKC	646.00
2832	3766	0	Furnace	N9MSB0801716C	534.00
2833	3766	1	Upfl N-Coil	END4X42L17	153.00
2834	3766	2	Air Cond	NXA442GKC	749.00
2835	3767	0	Furnace	N9MSB0802120C	540.00
2836	3767	1	Upfl N-Coil	END4X48L21	167.00
2837	3767	2	Air Cond	NXA448GKC	814.00
2838	3768	0	Furnace	N9MSB1002120C	564.00
2839	3768	1	Upfl N-Coil	END4X42L17	153.00
2840	3768	2	Air Cond	NXA442GKC	749.00
2841	3769	0	Furnace	N9MSB1002120C	564.00
2842	3769	1	Upfl N-Coil	END4X48L21	167.00
2843	3769	2	Air Cond	NXA448GKC	814.00
2844	3770	0	Furnace	N9MSB1202420C	611.00
2845	3770	1	Upfl N-Coil	END4X60L24	193.00
2846	3770	2	Air Cond	NXA460GKC	906.00
2847	3771	0	Furnace	N9MSB0601412C	502.00
2848	3771	1	Upfl N-Coil	ENH4X30L17	169.00
2849	3771	2	Air Cond	NXA430GKC	626.00
2850	3772	0	Furnace	G9MXE0401410A	618.00
2851	3772	1	Upfl N-Coil	END4X24L14	107.00
2852	3772	2	Air Cond	NXA618GKA	689.00
2853	3773	0	Furnace	G9MXE0401712A	618.00
2854	3773	1	Upfl N-Coil	END4X24L17	107.00
2855	3773	2	Air Cond	NXA624GKA	701.00
2856	3774	0	Furnace	G9MXE0601714A	633.00
2857	3774	1	Upfl N-Coil	END4X24L17	107.00
2858	3774	2	Air Cond	NXA624GKA	701.00
2859	3775	0	Furnace	G9MXE0601714A	633.00
2860	3775	1	Upfl N-Coil	END4X30L17	123.00
2861	3775	2	Air Cond	NXA630GKA	759.00
2862	3776	0	Furnace	G9MXE0601714A	633.00
2863	3776	1	Upfl N-Coil	END4X37L17	140.00
2864	3776	2	Air Cond	NXA636GKA	872.00
2865	3777	0	Furnace	G9MXE0801716A	750.00
2866	3777	1	Upfl N-Coil	END4X37L17	140.00
2867	3777	2	Air Cond	NXA636GKA	872.00
2868	3778	0	Furnace	G9MXE0802120A	781.00
2869	3778	1	Upfl N-Coil	END4X42L21	153.00
2870	3778	2	Air Cond	NXA642GKA	965.00
2871	3779	0	Furnace	G9MXE0802120A	781.00
2872	3779	1	Upfl N-Coil	END4X48L21	167.00
2873	3779	2	Air Cond	NXA648GKA	1109.00
2874	3780	0	Furnace	G9MXE1002120A	785.00
2875	3780	1	Upfl N-Coil	END4X42L21	153.00
2876	3780	2	Air Cond	NXA642GKA	965.00
2877	3781	0	Furnace	G9MXE1002120A	785.00
2878	3781	1	Upfl N-Coil	END4X48L21	167.00
2879	3781	2	Air Cond	NXA648GKA	1109.00
2880	3782	0	Furnace	G9MXE1002120A	785.00
2881	3782	1	Upfl N-Coil	END4X60L24	193.00
2882	3782	2	Air Cond	NXA660GKA	1275.00
2883	3783	0	Furnace	FEM4X1800BL	407.00
2884	3783	1	Upfl N-Coil	WKF0502B	45.00
2885	3783	2	Air Cond	N4H418GKG	604.00
2886	3784	0	Furnace	FEM4X1800BL	407.00
2887	3784	1	Upfl N-Coil	WKF0802B	53.00
2888	3784	2	Air Cond	N4H418GKG	604.00
2889	3785	0	Furnace	FEM4X3000BL	476.00
2890	3785	1	Upfl N-Coil	WKF0802B	53.00
2891	3785	2	Air Cond	N4H424GKG	662.00
2892	3786	0	Furnace	FEM4X3000BL	476.00
2893	3786	1	Upfl N-Coil	WKF1002B	60.00
2894	3786	2	Air Cond	N4H424GKG	662.00
2895	3787	0	Furnace	FEM4X3000BL	476.00
2896	3787	1	Upfl N-Coil	WKF0802B	53.00
2897	3787	2	Air Cond	N4H430GKG	733.00
2898	3788	0	Furnace	FEM4X3000BL	476.00
2899	3788	1	Upfl N-Coil	WKF1002B	60.00
2900	3788	2	Air Cond	N4H430GKG	733.00
2901	3789	0	Furnace	FEM4X3000BL	476.00
2902	3789	1	Upfl N-Coil	WKF1502B	85.00
2903	3789	2	Air Cond	N4H430GKG	733.00
2904	3790	0	Furnace	FXM4X3600AL	464.00
2905	3790	1	Upfl N-Coil	WKF1002B	60.00
2906	3790	2	Air Cond	N4H436GKG	814.00
2907	3791	0	Furnace	FXM4X3600AL	464.00
2908	3791	1	Upfl N-Coil	WKF1502B	85.00
2909	3791	2	Air Cond	N4H436GKG	814.00
2910	3792	0	Furnace	FXM4X3600AL	464.00
2911	3792	1	Upfl N-Coil	WKF2002B	102.00
2912	3792	2	Air Cond	N4H436GKG	814.00
2913	3793	0	Furnace	FEM4X4200BL	450.00
2914	3793	1	Upfl N-Coil	WKF1502B	85.00
2915	3793	2	Air Cond	N4H442GKG	906.00
2916	3794	0	Furnace	FEM4X4200BL	450.00
2917	3794	1	Upfl N-Coil	WKF2002B	102.00
2918	3794	2	Air Cond	N4H442GKG	906.00
2919	3795	0	Furnace	FEM4X4800BL	503.00
2920	3795	1	Upfl N-Coil	WKF1502B	85.00
2921	3795	2	Air Cond	N4H448GKG	1009.00
2922	3796	0	Furnace	FEM4X4800BL	503.00
2923	3796	1	Upfl N-Coil	WKF2002B	102.00
2924	3796	2	Air Cond	N4H448GKG	1009.00
2925	3797	0	Furnace	FEM4X4800BL	503.00
2926	3797	1	Upfl N-Coil	EHK25AHCF	152.00
2927	3797	2	Air Cond	N4H448GKG	1009.00
2928	3798	0	Furnace	FXM4X6000AL	572.00
2929	3798	1	Upfl N-Coil	WKF2002B	102.00
2930	3798	2	Air Cond	N4H460GKG	1094.00
2931	3799	0	Furnace	FXM4X6000AL	572.00
2932	3799	1	Upfl N-Coil	EHK25AHCF	152.00
2933	3799	2	Air Cond	N4H460GKG	1094.00
2934	3800	0	Furnace	G9MXE0401712A	618.00
2935	3800	1	Upfl N-Coil	EAM4X24L17	158.00
2936	3800	2	Air Cond	N4H418GKG	604.00
2937	3801	0	Furnace	G9MXE0601714A	633.00
2938	3801	1	Upfl N-Coil	END4X30L17	123.00
2939	3801	2	Air Cond	N4H424GKG	662.00
2940	3802	0	Furnace	G9MXE0601714A	633.00
2941	3802	1	Upfl N-Coil	EAM4X30L17	169.00
2942	3802	2	Air Cond	N4H430GKG	733.00
2943	3803	0	Furnace	G9MXE0601714A	633.00
2944	3803	1	Upfl N-Coil	EAM4X36L17	244.00
2945	3803	2	Air Cond	N4H436GKG	814.00
2946	3804	0	Furnace	G9MXE0801716A	750.00
2947	3804	1	Upfl N-Coil	EAM4X36L17	244.00
2948	3804	2	Air Cond	N4H436GKG	814.00
2949	3805	0	Furnace	G9MXE0802120A	781.00
2950	3805	1	Upfl N-Coil	END4X48L21	167.00
2951	3805	2	Air Cond	N4H442GKG	906.00
2952	3806	0	Furnace	G9MXE0802120A	781.00
2953	3806	1	Upfl N-Coil	EAM4X48L21	319.00
2954	3806	2	Air Cond	N4H448GKG	1009.00
2955	3807	0	Furnace	G9MXE1002120A	785.00
2956	3807	1	Upfl N-Coil	EAM4X60L21	395.00
2957	3807	2	Air Cond	N4H448GKG	1009.00
2958	3808	0	Furnace	G9MXE0401712A	618.00
2959	3808	1	Upfl N-Coil	EAM4X24L17	158.00
2960	3808	2	Air Cond	N4H424GKG	662.00
2961	3809	0	Furnace	G9MXE0601714A	633.00
2962	3809	1	Upfl N-Coil	EAM4X30L17	169.00
2963	3809	2	Air Cond	N4H430GKG	733.00
2964	3810	0	Furnace	G9MXE0601714A	633.00
2965	3810	1	Upfl N-Coil	EAM4X36L17	244.00
2966	3810	2	Air Cond	N4H436GKG2	814.00
2967	3811	0	Furnace	G9MXE0802120A	781.00
2968	3811	1	Upfl N-Coil	EAM4X42L21	268.00
2969	3811	2	Air Cond	N4H442GKG	906.00
2970	3812	0	Furnace	G9MXE0401712A	618.00
2971	3812	1	Upfl N-Coil	END4X30L17	123.00
2972	3812	2	Air Cond	NXH524GKA	845.00
2973	3813	0	Furnace	G9MXE0601412A	633.00
2974	3813	1	Upfl N-Coil	END4X30L14	123.00
2975	3813	2	Air Cond	NXH524GKA	845.00
2976	3814	0	Furnace	G9MXE0601714A	633.00
2977	3814	1	Upfl N-Coil	EAM4X30L17	169.00
2978	3814	2	Air Cond	NXH530GKA	962.00
2979	3815	0	Furnace	G9MXE0601714A	633.00
2980	3815	1	Upfl N-Coil	END4X42L17	153.00
2981	3815	2	Air Cond	NXH537GKA	1125.00
2982	3816	0	Furnace	G9MXE0801716A	750.00
2983	3816	1	Upfl N-Coil	END4X42L17	153.00
2984	3816	2	Air Cond	NXH536GKA	1048.00
2985	3817	0	Furnace	G9MXE0802120A	781.00
2986	3817	1	Upfl N-Coil	END4X48L21	167.00
2987	3817	2	Air Cond	NXH542GKA	1159.00
2988	3818	0	Furnace	G9MXE1002120A	785.00
2989	3818	1	Upfl N-Coil	END4X48L21	167.00
2990	3818	2	Air Cond	NXH542GKA	1159.00
2991	3819	0	Furnace	G9MXE0401712A	618.00
2992	3819	1	Upfl N-Coil	EAM4X24L17	158.00
2993	3819	2	Air Cond	NXH524GKA	845.00
2994	3820	0	Furnace	G9MXE0601714A	633.00
2995	3820	1	Upfl N-Coil	EAM4X30L17	169.00
2996	3820	2	Air Cond	NXH530GKA	962.00
2997	3821	0	Furnace	G9MXE0601714A	633.00
2998	3821	1	Upfl N-Coil	ENH4X36L17	180.00
2999	3821	2	Air Cond	NXH537GKA	1125.00
3000	3822	0	Furnace	G9MXE0802120A	781.00
3001	3822	1	Upfl N-Coil	EAM4X48L21	319.00
3002	3822	2	Air Cond	NXH542GKA	1159.00
3003	3823	0	Furnace	FXM4X1800AL	469.00
3004	3823	1	Upfl N-Coil	WKF0802B	53.00
3005	3823	2	Air Cond	NXH518GKA	814.00
3006	3824	0	Furnace	FXM4X1800AL	469.00
3007	3824	1	Upfl N-Coil	WKF1002B	60.00
3008	3824	2	Air Cond	NXH518GKA	814.00
3009	3825	0	Furnace	FXM4X2400AL	504.00
3010	3825	1	Upfl N-Coil	WKF0802B	53.00
3011	3825	2	Air Cond	NXH524GKA	845.00
3012	3826	0	Furnace	FXM4X2400AL	504.00
3013	3826	1	Upfl N-Coil	WKF1002B	60.00
3014	3826	2	Air Cond	NXH524GKA	845.00
3015	3827	0	Furnace	FXM4X3000AL	538.00
3016	3827	1	Upfl N-Coil	WKF0802B	53.00
3017	3827	2	Air Cond	NXH530GKA	962.00
3018	3828	0	Furnace	FXM4X3000AL	538.00
3019	3828	1	Upfl N-Coil	WKF1002B	60.00
3020	3828	2	Air Cond	NXH530GKA	962.00
3021	3829	0	Furnace	FXM4X3000AL	538.00
3022	3829	1	Upfl N-Coil	WKF1002B	60.00
3023	3829	2	Air Cond	NXH530GKA	962.00
3024	3830	0	Furnace	FXM4X3000AL	538.00
3025	3830	1	Upfl N-Coil	WKF1502B	85.00
3026	3830	2	Air Cond	NXH530GKA	962.00
3027	3831	0	Furnace	FXM4X3600AL	464.00
3028	3831	1	Upfl N-Coil	WKF1002B	60.00
3029	3831	2	Air Cond	NXH536GKA	1048.00
3030	3832	0	Furnace	FXM4X3600AL	464.00
3031	3832	1	Upfl N-Coil	WKF1502B	85.00
3032	3832	2	Air Cond	NXH536GKA	1048.00
3033	3833	0	Furnace	FXM4X3600AL	464.00
3034	3833	1	Upfl N-Coil	WKF2002B	102.00
3035	3833	2	Air Cond	NXH536GKA	1048.00
3036	3834	0	Furnace	FXM4X4200AL	512.00
3037	3834	1	Upfl N-Coil	WKF1502B	85.00
3038	3834	2	Air Cond	NXH542GKA	1159.00
3039	3835	0	Furnace	FXM4X4200AL	512.00
3040	3835	1	Upfl N-Coil	WKF2002B	102.00
3041	3835	2	Air Cond	NXH542GKA	1159.00
3042	3836	0	Furnace	FXM4X4800AL	564.00
3043	3836	1	Upfl N-Coil	WKF2002B	102.00
3044	3836	2	Air Cond	NXH548GKA	1327.00
3045	3837	0	Furnace	FXM4X6000AL	572.00
3046	3837	1	Upfl N-Coil	WKF2002B	102.00
3047	3837	2	Air Cond	NXH560GKA	1508.00
3048	3838	0	Air Hanlder (EEV)	DFVE24BP1400	1010.00
3049	3838	1	Aux Heater	HKSC08XC	60.00
3050	3838	2	Heat Pump	DZ6VSA1810	1542.00
3051	3838	4	FIT Controller	DTST-TOU-A	400.00
3052	3839	0	Air Hanlder (EEV)	DFVE24BP1400	1010.00
3053	3839	1	Aux Heater	HKSC08XC	60.00
3054	3839	2	Heat Pump	DZ6VSA2410	1605.00
3055	3839	4	FIT Controller	DTST-TOU-A	400.00
3056	3840	0	Air Hanlder (EEV)	DFVE36CP1400	1126.00
3057	3840	1	Aux Heater	HKSC08XC	60.00
3058	3840	2	Heat Pump	DZ6VSA3010	1756.00
3059	3840	4	FIT Controller	DTST-TOU-A	400.00
3060	3841	0	Air Hanlder (EEV)	DFVE36CP1400	1126.00
3061	3841	1	Aux Heater	HKSC08XC	60.00
3062	3841	2	Heat Pump	DZ6VSA3610	1909.00
3063	3841	4	FIT Controller	DTST-TOU-A	400.00
3064	3842	0	Air Hanlder (EEV)	DFVE42CP1400	1169.00
3065	3842	1	Aux Heater	HKSC10XC	61.00
3066	3842	2	Heat Pump	DZ6VSA4210	2085.00
3067	3842	4	FIT Controller	DTST-TOU-A	400.00
3068	3843	0	Air Hanlder (EEV)	DZ6VSA4810	2263.00
3069	3843	1	Aux Heater	HKSC15XA	99.00
3070	3843	2	Heat Pump	DZ6VSA4810	2263.00
3071	3843	4	FIT Controller	DTST-TOU-A	400.00
3072	3844	0	Air Hanlder (EEV)	FDMQ18WVJU9	1189.00
3073	3844	2	Heat Pump	RX18WMVJU9	1435.00
3074	3844	4	FIT Controller	DTST-TOU-A	400.00
3075	3845	0	Air Handler Wall Mount	ASU18RLB	584.12
3076	3845	2	Heat Pump	AOU18RLB	874.07
3077	3846	0	Air Handler Wall Mount	ASU24RLB	630.69
3078	3846	2	Heat Pump	AOU24RLB	946.03
3079	3847	0	Air Handler Wall Mount	ASU30RLXB	877.25
3080	3847	2	Heat Pump	AOU30RLXB	1315.88
3081	3848	0	Air Handler Wall Mount	ASU36RLXB	1169.31
3082	3848	2	Heat Pump	AOU36RLXB	1753.97
3083	3849	0	Air Handler Wall Mount	ASUG09LMAS	467.19
3084	3849	2	Heat Pump	AOUG09LMAS1	701.06
3085	3850	0	Air Handler Wall Mount	ASUG12LMAS	514.28
3086	3850	2	Heat Pump	AOUG12LMAS1	772.49
3087	3851	0	Air Handler Wall Mount	ASU18RLF	783.07
3088	3851	2	Heat Pump	AOU18RLXFW1	1179.89
3089	3852	0	Air Handler Wall Mount	ASU24RLF	834.39
3090	3852	2	Heat Pump	AOU24RLXFW1	1396.30
3091	3853	0	Air Handler Wall Mount	ASUG09LZAS	582.54
3092	3853	2	Heat Pump	AOUG09LZAS1	809.52
3093	3854	0	Air Handler Wall Mount	ASUG12LZAS	635.45
3094	3854	2	Heat Pump	AOUG12LZAS1	837.73
3095	3855	0	Air Handler Wall Mount	ASUG15LZAS	680.43
3096	3855	2	Heat Pump	AOUG15LZAS1	946.03
3097	3856	0	Air Handler Wall Mount	ARU09RLF	641.78
3098	3856	2	Heat Pump	AOU09RLFC	800.00
3099	3857	0	Air Handler Wall Mount	ARU12RLF	665.67
3100	3857	2	Heat Pump	AOU12RLFC	871.43
3101	3858	0	Air Handler Wall Mount	ARU18RLF	868.74
3102	3858	2	Heat Pump	AOU18RLFC	1161.38
3103	3859	0	Air Handler Wall Mount	AGU9RLF	674.07
3104	3859	2	Heat Pump	AOU9RLFF	785.18
3105	3860	0	Air Handler Wall Mount	AGU12RLF	734.92
3106	3860	2	Heat Pump	AOU12RLFF	857.14
3107	3861	0	Air Handler Wall Mount	AGU15RLF	787.83
3108	3861	2	Heat Pump	AOU15RLFF	917.99
3109	3862	0	Furnace	GRVT960403BN	1120.00
3110	3862	1	Coil	CAPTA1818B3	309.00
3111	3862	2	Air Cond	GLXS5BA1810	930.00
3112	3863	0	Furnace	GRVT960403BN	1120.00
3113	3863	1	Coil	CAPTA2422A3	315.00
3114	3863	2	Air Cond	GLXS5BA2410	1003.00
3115	3864	0	Furnace	GRVT960403BN	1120.00
3116	3864	1	Coil	CAPTA3626B3	376.00
3117	3864	2	Air Cond	GLXS5BA3010	1049.00
3118	3865	0	Furnace	GRVT960603BN	1163.00
3119	3865	1	Coil	CAPTA3626B3	376.00
3120	3865	2	Air Cond	GLXS5BA3010	1049.00
3121	3866	0	Furnace	GRVT960603BN	1163.00
3122	3866	1	Coil	CAPTA4230C3	401.00
3123	3866	2	Air Cond	GLXS5BA3610	1177.00
3124	3867	0	Furnace	GRVT960804CN	1415.00
3125	3867	1	Coil	CAPTA4230C3	401.00
3126	3867	2	Air Cond	GLXS5BA4210	1332.00
3127	3868	0	Furnace	GRVT960804CN	1415.00
3128	3868	1	Coil	CAPTA6030C3	456.00
3129	3868	2	Air Cond	GLXS5BA4810	1441.00
3130	3869	0	Furnace	AMST24BU1300	656.00
3131	3869	1	Coil	HKTSD08X1	69.00
3132	3869	2	Air Cond	GLZS5BA1810	1206.00
3133	3870	0	Furnace	AMST24BU1300	656.00
3134	3870	1	Coil	HKTSD08X1	69.00
3135	3870	2	Air Cond	GLZS5BA2410	1246.00
3136	3871	0	Furnace	AMST30BU1300	683.00
3137	3871	1	Coil	HKTSD08X1	69.00
3138	3871	2	Air Cond	GLZS5BA3010	1392.00
3139	3872	0	Furnace	AMST30BU1300	683.00
3140	3872	1	Coil	HKTSD10X1	72.00
3141	3872	2	Air Cond	GLZS5BA3010	1392.00
3142	3873	0	Furnace	AMST36BU1300	728.00
3143	3873	1	Coil	HKTSD08X1	69.00
3144	3873	2	Air Cond	GLZS5BA3610	1528.00
3145	3874	0	Furnace	AMST36BU1300	728.00
3146	3874	1	Coil	HKTSD15XB	114.00
3147	3874	2	Air Cond	GLZS5BA3610	1528.00
3148	3875	0	Furnace	AMST42CU1300	770.00
3149	3875	1	Coil	HKTSD15XB	114.00
3150	3875	2	Air Cond	GLZS5BA4210	1653.00
3151	3876	0	Furnace	AMST48CU1300	793.00
3152	3876	1	Coil	HKTSD20DB	130.00
3153	3876	2	Air Cond	GLZS5BA4810	1809.00
3154	3877	0	Furnace	GR9S920403AN	680.00
3155	3877	1	Coil	CAPTA2422A3	315.00
3156	3877	2	Air Cond	GLXS4BA1810	779.00
3157	3878	0	Furnace	GR9S920403AN	680.00
3158	3878	1	Coil	CAPTA2422A3	315.00
3159	3878	2	Air Cond	GLXS4BA2410	842.00
3160	3879	0	Furnace	GR9S920403AN	680.00
3161	3879	1	Coil	CAPTA3026B3	371.00
3162	3879	2	Air Cond	GLXS4BA3010	878.00
3163	3880	0	Furnace	GR9S920603BN	725.00
3164	3880	1	Coil	CAPTA3026B3	371.00
3165	3880	2	Air Cond	GLXS4BA3010	878.00
3166	3881	0	Furnace	GR9S920603BN	725.00
3167	3881	1	Coil	CAPTA3626B3	376.00
3168	3881	2	Air Cond	GLXS4BA3610	987.00
3169	3882	0	Furnace	GR9S920803BN	792.00
3170	3882	1	Coil	CAPTA3626B3	376.00
3171	3882	2	Air Cond	GLXS4BA3610	987.00
3172	3883	0	Furnace	GR9S920804CN	844.00
3173	3883	1	Coil	CAPTA4230C3	401.00
3174	3883	2	Air Cond	GLXS4BA4210	1116.00
3175	3884	0	Furnace	GR9S921004CN	917.00
3176	3884	1	Coil	CAPTA4230C3	401.00
3177	3884	2	Air Cond	GLXS4BA4210	1116.00
3178	3885	0	Furnace	GR9S920804CN	844.00
3179	3885	1	Coil	CAPTA6030D3	459.00
3180	3885	2	Air Cond	GLXS4BA4810	1207.00
3181	3886	0	Furnace	GR9S921004CN	917.00
3182	3886	1	Coil	CAPTA6030D3	459.00
3183	3886	2	Air Cond	GLXS4BA4810	1207.00
3184	3887	0	Furnace	GR9S921205DN	992.00
3185	3887	1	Coil	CAPTA6030D3	459.00
3186	3887	2	Air Cond	GLXS4BA6010	1378.00
3187	3888	0	Furnace	GR9T960403AN	808.00
3188	3888	1	Coil	CAPTA2422A3	315.00
3189	3888	2	Air Cond	GLXS4BA2410	842.00
3190	3889	0	Furnace	GR9T960403AN	808.00
3191	3889	1	Coil	CAPTA3026B3	371.00
3192	3889	2	Air Cond	GLXS4BA3010	878.00
3193	3890	0	Furnace	GR9T960603BN	868.00
3194	3890	1	Coil	CAPTA3026B3	371.00
3195	3890	2	Air Cond	GLXS4BA3010	878.00
3196	3891	0	Furnace	GR9T960603BN	868.00
3197	3891	1	Coil	CAPTA3626B3	376.00
3198	3891	2	Air Cond	GLXS4BA3610	987.00
3199	3892	0	Furnace	GR9T960803BN	1010.00
3200	3892	1	Coil	CAPTA3626B3	376.00
3201	3892	2	Air Cond	GLXS4BA3610	987.00
3202	3893	0	Furnace	GR9T960804CN	1042.00
3203	3893	1	Coil	CAPTA4230C3	401.00
3204	3893	2	Air Cond	GLXS4BA4210	1116.00
3205	3894	0	Furnace	GR9T961004CN	1072.00
3206	3894	1	Coil	CAPTA4230C3	401.00
3207	3894	2	Air Cond	GLXS4BA4210	1116.00
3208	3895	0	Furnace	GR9T960804CN	1042.00
3209	3895	1	Coil	CAPTA6030D3	459.00
3210	3895	2	Air Cond	GLXS4BA4810	1207.00
3211	3896	0	Furnace	GR9T961004CN	1072.00
3212	3896	1	Coil	CAPTA6030D3	459.00
3213	3896	2	Air Cond	GLXS4BA4810	1207.00
3214	3897	0	Furnace	GR9T961005CN	1108.00
3215	3897	1	Coil	CAPTA6030D3	459.00
3216	3897	2	Air Cond	GLXS4BA4810	1207.00
3217	3898	0	Furnace	GR9T961205DN	1131.00
3218	3898	1	Coil	CAPTA6030D3	459.00
3219	3898	2	Air Cond	GLXS4BA6010	1378.00
3220	3899	0	Furnace	GR9T960303AN	778.00
3221	3899	1	Coil	CHPTA2426B3	344.00
3222	3899	2	Air Cond	GLXS4BA1810	779.00
3223	3900	0	Furnace	GR9T960303AN	778.00
3224	3900	1	Coil	CHPTA3026B3	355.00
3225	3900	2	Air Cond	GLXS4BA2410	842.00
3226	3901	0	Furnace	GR9T960403AN	808.00
3227	3901	1	Coil	CHPTA3026B3	355.00
3228	3901	2	Air Cond	GLXS4BA2410	842.00
3229	3902	0	Furnace	GR9T960403AN	808.00
3230	3902	1	Coil	CHPTA3630B3	372.00
3231	3902	2	Air Cond	GLXS4BA3010	878.00
3232	3903	0	Furnace	GR9T960603BN	868.00
3233	3903	1	Coil	CHPTA3630B3	372.00
3234	3903	2	Air Cond	GLXS4BA3010	878.00
3235	3904	0	Furnace	GR9T960603BN	868.00
3236	3904	1	Coil	CHPTA3630C3	378.00
3237	3904	2	Air Cond	GLXS4BA3610	987.00
3238	3905	0	Furnace	GR9T960803BN	1010.00
3239	3905	1	Coil	CHPTA4830C3	431.00
3240	3905	2	Air Cond	GLXS4BA4210	1116.00
3241	3906	0	Furnace	GR9T960804CN	1042.00
3242	3906	1	Coil	CHPTA4830C3	431.00
3243	3906	2	Air Cond	GLXS4BA4210	1116.00
3244	3907	0	Furnace	GR9T961004CN	1072.00
3245	3907	1	Coil	CHPTA6030D3	442.00
3246	3907	2	Air Cond	GLXS4BA4810	1207.00
3247	3908	0	Furnace	GR9T960403AN	808.00
3248	3908	1	Coil	CAPTA2422A3	315.00
3249	3908	2	Air Cond	GLXS5BA2410	1003.00
3250	3909	0	Furnace	GR9T960403AN	808.00
3251	3909	1	Coil	CAPTA3026B3	371.00
3252	3909	2	Air Cond	GLXS5BA3010	1049.00
3253	3910	0	Furnace	GR9T960603BN	868.00
3254	3910	1	Coil	CAPTA2422B3	318.00
3255	3910	2	Air Cond	GLXS5BA2410	1003.00
3256	3911	0	Furnace	GR9T960603BN	868.00
3257	3911	1	Coil	CAPTA3026B3	371.00
3258	3911	2	Air Cond	GLXS5BA3010	1049.00
3259	3912	0	Furnace	GR9T960603BN	868.00
3260	3912	1	Coil	CAPTA3626B3	376.00
3261	3912	2	Air Cond	GLXS5BA3610	1177.00
3262	3913	0	Furnace	GR9T960803BN	1010.00
3263	3913	1	Coil	CAPTA3626B3	376.00
3264	3913	2	Air Cond	GLXS5BA3610	1177.00
3265	3914	0	Furnace	GR9T961004CN	1072.00
3266	3914	1	Coil	CAPTA4230C3	401.00
3267	3914	2	Air Cond	GLXS5BA4210	1332.00
3268	3915	0	Furnace	GR9T961004CN	1072.00
3269	3915	1	Coil	CAPTA6030C3	456.00
3270	3915	2	Air Cond	GLXS5BA4810	1441.00
3271	3916	0	Furnace	GR9T961005CN	1108.00
3272	3916	1	Coil	CAPTA6030C3	456.00
3273	3916	2	Air Cond	GLXS5BA6010	1645.00
3274	3917	0	Furnace	AMST24BU1300	656.00
3275	3917	1	Coil	HKTSD05X1	52.00
3276	3917	2	Air Cond	GLZS4BA1810	965.00
3277	3918	0	Furnace	AMST24BU1300	656.00
3278	3918	1	Coil	HKTSD08X1	69.00
3279	3918	2	Air Cond	GLZS4BA1810	965.00
3280	3919	0	Furnace	AMST24BU1300	656.00
3281	3919	1	Coil	HKTSD08X1	69.00
3282	3919	2	Air Cond	GLZS4BA2410	998.00
3283	3920	0	Furnace	AMST24BU1300	656.00
3284	3920	1	Coil	HKTSD10X1	72.00
3285	3920	2	Air Cond	GLZS4BA2410	998.00
3286	3921	0	Furnace	AMST30BU1300	683.00
3287	3921	1	Coil	HKTSD10X1	72.00
3288	3921	2	Air Cond	GLZS4BA3010	1153.00
3289	3922	0	Furnace	AMST30BU1300	683.00
3290	3922	1	Coil	HKTSD15XB	114.00
3291	3922	2	Air Cond	GLZS4BA3010	1153.00
3292	3923	0	Furnace	AMST36CU1300	744.00
3293	3923	1	Coil	HKTSD10X1	72.00
3294	3923	2	Air Cond	GLZS4BA3610	1323.00
3295	3924	0	Furnace	AMST36CU1300	744.00
3296	3924	1	Coil	HKTSD15XB	114.00
3297	3924	2	Air Cond	GLZS4BA3610	1323.00
3298	3925	0	Furnace	AMST42CU1300	770.00
3299	3925	1	Coil	HKTSD15XB	114.00
3300	3925	2	Air Cond	GLZS4BA4210	1430.00
3301	3926	0	Furnace	AMST48CU1300	793.00
3302	3926	1	Coil	HKTSD20DB	130.00
3303	3926	2	Air Cond	GLZS4BA4810	1564.00
3304	3927	0	Furnace	AMST60DU1300	897.00
3305	3927	1	Coil	HKTSD20DB	130.00
3306	3927	2	Air Cond	GLZS4BA6010	1831.00
3307	3928	0	Furnace	AHVE24BP1300	1063.00
3308	3928	1	Coil	HKTSD05X1	52.00
3309	3928	2	Air Cond	GZV6SA1810	1415.00
3310	3928	4	Component 5	389	\N
3311	3929	0	Furnace	AHVE24BP1300	1063.00
3312	3929	1	Coil	HKTSD05X1	52.00
3313	3929	2	Air Cond	GZV6SA2410	1472.00
3314	3929	4	Component 5	389	\N
3315	3930	0	Furnace	AHVE24BP1300	1063.00
3316	3930	1	Coil	HKTSD08X1	69.00
3317	3930	2	Air Cond	GZV6SA2410	1472.00
3318	3930	4	Component 5	389	\N
3319	3931	0	Furnace	AHVE24BP1300	1063.00
3320	3931	1	Coil	HKTSD10X1	72.00
3321	3931	2	Air Cond	GZV6SA2410	1472.00
3322	3931	4	Component 5	389	\N
3323	3932	0	Furnace	AHVE36CP1300	1185.00
3324	3932	1	Coil	HKTSD08X1	69.00
3325	3932	2	Air Cond	GZV6SA3010	1610.00
3326	3932	4	Component 5	389	\N
3327	3933	0	Furnace	AHVE36CP1300	1185.00
3328	3933	1	Coil	HKTSD10X1	72.00
3329	3933	2	Air Cond	GZV6SA3010	1610.00
3330	3933	4	Component 5	389	\N
3331	3934	0	Furnace	AHVE36CP1300	1185.00
3332	3934	1	Coil	HKTSD08X1	69.00
3333	3934	2	Air Cond	GZV6SA3610	1751.00
3334	3934	4	Component 5	389	\N
3335	3935	0	Furnace	AHVE36CP1300	1185.00
3336	3935	1	Coil	HKTSD10X1	72.00
3337	3935	2	Air Cond	GZV6SA3610	1751.00
3338	3935	4	Component 5	389	\N
3339	3936	0	Furnace	AHVE42CP1300	1230.00
3340	3936	1	Coil	HKTSD15XB	114.00
3341	3936	2	Air Cond	GZV6SA4210	1913.00
3342	3936	4	Component 5	389	\N
3343	3937	0	Furnace	AHVE48DP1300	1245.00
3344	3937	1	Coil	HKTSD15XB	114.00
3345	3937	2	Air Cond	GZV6SA4810	2075.00
3346	3937	4	Component 5	389	\N
3347	3938	0	Furnace	AHVE60DP1300	1306.00
3348	3938	1	Coil	HKTSD15XB	114.00
3349	3938	2	Air Cond	GZV6SA6010	2394.00
3350	3938	4	Component 5	389	\N
3351	3939	0	Furnace	ML193UH045XE36B	624.00
3352	3939	1	Upfl Coil	CK40CT-24B	314.00
3353	3939	2	Air Cond	ML17XC1018	954.00
3354	3940	0	Furnace	ML193UH045XE36B	624.00
3355	3940	1	Upfl Coil	CK40CT-30B	336.00
3356	3940	2	Air Cond	ML17XC1024	986.00
3357	3941	0	Furnace	ML193UH045XE36B	624.00
3358	3941	1	Upfl Coil	CK40CT-30B	336.00
3359	3941	2	Air Cond	ML17XC1030	1029.00
3360	3942	0	Furnace	ML193UH070XE36B	659.00
3361	3942	1	Upfl Coil	CK40CT-30B	336.00
3362	3942	2	Air Cond	ML17XC1030	1029.00
3363	3943	0	Furnace	ML193UH070XE36B	659.00
3364	3943	1	Upfl Coil	CK40CT-36B	361.00
3365	3943	2	Air Cond	ML17XC1036	1059.00
3366	3944	0	Furnace	ML193UH090XE48C	694.00
3367	3944	1	Upfl Coil	CK40CT-49C	462.00
3368	3944	2	Air Cond	ML17XC1042	1166.00
3369	3945	0	Furnace	ML193UH090XE48C	694.00
3370	3945	1	Upfl Coil	CK40CT-49C	462.00
3371	3945	2	Air Cond	ML17XC1048	1325.00
3372	3946	0	Furnace	ML193UH110XE60C	756.00
3373	3946	1	Upfl Coil	CK40CT-60C	470.00
3374	3946	2	Air Cond	ML17XC1060	1538.00
3375	3947	0	Furnace	ML193UH045XE36B	624.00
3376	3947	1	Upfl Coil	CK40CT-24B	314.00
3377	3947	2	Air Cond	ML14KC1-018	989.00
3378	3948	0	Furnace	ML193UH045XE36B	624.00
3379	3948	1	Upfl Coil	CK40CT-30B	336.00
3380	3948	2	Air Cond	ML14KC1-024	1021.00
3381	3949	0	Furnace	ML193UH045XE36B	624.00
3382	3949	1	Upfl Coil	CK40CT-30B	336.00
3383	3949	2	Air Cond	ML14KC1-030	1066.00
3384	3950	0	Furnace	ML193UH070XE36B	659.00
3385	3950	1	Upfl Coil	CK40CT-30B	336.00
3386	3950	2	Air Cond	ML14KC1-030	1066.00
3387	3951	0	Furnace	ML193UH070XE36B	659.00
3388	3951	1	Upfl Coil	CK40CT-36B	361.00
3389	3951	2	Air Cond	ML14KC1-036	1100.00
3390	3952	0	Furnace	ML193UH090XE48C	694.00
3391	3952	1	Upfl Coil	CK40CT-49C	462.00
3392	3952	2	Air Cond	ML14KC1-042	1209.00
3393	3953	0	Furnace	ML193UH090XE48C	694.00
3394	3953	1	Upfl Coil	CK40CT-49C	462.00
3395	3953	2	Air Cond	ML14KC1-048	1374.00
3396	3954	0	Furnace	ML193UH110XE60C	756.00
3397	3954	1	Upfl Coil	CK40CT-60C	470.00
3398	3954	2	Air Cond	ML14KC1-060	1593.00
3399	3955	0	Furnace	ML193UH045XE36B	624.00
3400	3955	1	Upfl Coil	CX35 24B 6F	175.00
3401	3955	2	Air Cond	ML18XC2024	1302.00
3402	3956	0	Furnace	ML193UH070XE36B	659.00
3403	3956	1	Upfl Coil	CX35 48B 6F	245.00
3404	3956	2	Air Cond	ML18XC2036	1400.00
3405	3957	0	Furnace	ML193UH090XE48C	694.00
3406	3957	1	Upfl Coil	CX35 49C 6F	323.00
3407	3957	2	Air Cond	ML18XC2048	1750.00
3408	3958	0	Furnace	ML193UH110XE60C	756.00
3409	3958	1	Upfl Coil	CX35 49C 6F	323.00
3410	3958	2	Air Cond	ML18XC2060	2030.00
3411	3959	0	Furnace	ML193UH045XE36B	624.00
3412	3959	1	Upfl Coil	CHX35 24B 6F	211.00
3413	3959	2	Air Cond	ML18XC2024	1302.00
3414	3960	0	Furnace	ML193UH070XE36B	659.00
3415	3960	1	Upfl Coil	CHX35 42C 6F	334.00
3416	3960	2	Air Cond	ML18XC2036	1400.00
3417	3961	0	Furnace	EL296UH045XV36B	1523.00
3418	3961	1	Upfl Coil	CX35 24B 6F	175.00
3419	3961	2	Air Cond	ML18XC2024	1302.00
3420	3962	0	Furnace	EL296UH070XV36B	1575.00
3421	3962	1	Upfl Coil	CX35 24B 6F	175.00
3422	3962	2	Air Cond	ML18XC2024	1302.00
3423	3963	0	Furnace	EL296UH070XV36B	1575.00
3424	3963	1	Upfl Coil	CX35 48B 6F	245.00
3425	3963	2	Air Cond	ML18XC2036	1400.00
3426	3964	0	Furnace	EL296UH045XV36B	1523.00
3427	3964	1	Upfl Coil	CHX35 24B 6F	211.00
3428	3964	2	Air Cond	ML18XC2024	1302.00
3429	3965	0	Furnace	EL296UH070XV36B	1575.00
3430	3965	1	Upfl Coil	CHX35 24B 6F	211.00
3431	3965	2	Air Cond	ML18XC2024	1302.00
3432	3966	0	Furnace	EL296UH070XV36B	1575.00
3433	3966	1	Upfl Coil	CHX35 42C 6F	334.00
3434	3966	2	Air Cond	ML18XC2036	1400.00
3435	3967	0	Furnace	ML196UH070XE36BK	740.00
3436	3967	1	Upfl Coil	CK40CT-30B	336.00
3437	3967	2	Air Cond	ML17XC1024	986.00
3438	3968	0	Furnace	ML196UH070XE36BK	740.00
3439	3968	1	Upfl Coil	CK40CT-36B	361.00
3440	3968	2	Air Cond	ML17XC1030	1029.00
3441	3969	0	Furnace	CBA25UH-018	427.00
3442	3969	1	Upfl Coil	ECBA25-5CB	52.00
3443	3969	2	Air Cond	ML17XP1018	1145.00
3444	3970	0	Furnace	CBA25UH-024	443.00
3445	3970	1	Upfl Coil	ECBA25-5CB	52.00
3446	3970	2	Air Cond	ML17XP1024	1246.00
3447	3971	0	Furnace	CBA25UH-024	443.00
3448	3971	1	Upfl Coil	ECBA25-7.5CB	69.00
3449	3971	2	Air Cond	ML17XP1024	1246.00
3450	3972	0	Furnace	CBA25UH-024	443.00
3451	3972	1	Upfl Coil	ECBA25-10CB	74.00
3452	3972	2	Air Cond	ML17XP1024	1246.00
3453	3973	0	Furnace	CBA25UH-030	478.00
3454	3973	1	Upfl Coil	ECBA25-10CB	74.00
3455	3973	2	Air Cond	ML17XP1030	1332.00
3456	3974	0	Furnace	CBA25UH-036	509.00
3457	3974	1	Upfl Coil	ECBA25-10CB	74.00
3458	3974	2	Air Cond	ML17XP1036	1432.00
3459	3975	0	Furnace	CBA25UH-036	509.00
3460	3975	1	Upfl Coil	ECBA25-15CB	111.00
3461	3975	2	Air Cond	ML17XP1036	1432.00
3462	3976	0	Furnace	CBA25UH-042	560.00
3463	3976	1	Upfl Coil	ECBA25-15CB	111.00
3464	3976	2	Air Cond	ML17XP1042	1603.00
3465	3977	0	Furnace	CBA25UH-048	636.00
3466	3977	1	Upfl Coil	ECBA25-15CB	111.00
3467	3977	2	Air Cond	ML17XP1048	1689.00
3468	3978	0	Furnace	CBA25UH-048	636.00
3469	3978	1	Upfl Coil	ECBA25-20CB	134.00
3470	3978	2	Air Cond	ML17XP1048	1689.00
3471	3979	0	Furnace	CBA25UH-060	738.00
3472	3979	1	Upfl Coil	ECBA25-20CB	134.00
3473	3979	2	Air Cond	ML17XP1060	1860.00
3474	3980	0	Furnace	CBK45UHPT-018	669.00
3475	3980	1	Upfl Coil	ECB45-5CB-P	52.00
3476	3980	2	Air Cond	ML14KP1-018-230	1213.00
3477	3981	0	Furnace	CBK45UHPT-024	684.00
3478	3981	1	Upfl Coil	ECB45-5CB-P	52.00
3479	3981	2	Air Cond	ML14KP1-024-230	1319.00
3480	3982	0	Furnace	CBK45UHPT-024	684.00
3481	3982	1	Upfl Coil	ECB45-7.5CB-P	69.00
3482	3982	2	Air Cond	ML14KP1-024-230	1319.00
3483	3983	0	Furnace	CBK45UHPT-024	684.00
3484	3983	1	Upfl Coil	ECB45-10CB-P	74.00
3485	3983	2	Air Cond	ML14KP1-024-230	1319.00
3486	3984	0	Furnace	CBK45UHPT-030	719.00
3487	3984	1	Upfl Coil	ECB45-10CB-P	74.00
3488	3984	2	Air Cond	ML14KP1-030-230	1417.00
3489	3985	0	Furnace	CBK45UHPT-036	750.00
3490	3985	1	Upfl Coil	ECB45-10CB-P	74.00
3491	3985	2	Air Cond	ML14KP1-036-230	1517.00
3492	3986	0	Furnace	CBK45UHPT-036	750.00
3493	3986	1	Upfl Coil	ECB45-15CB-P	111.00
3494	3986	2	Air Cond	ML14KP1-036-230	1517.00
3495	3987	0	Furnace	CBK45UHPT-042	802.00
3496	3987	1	Upfl Coil	ECB45-15CB-P	111.00
3497	3987	2	Air Cond	ML14KP1-042-230	1698.00
3498	3988	0	Furnace	CBK45UHET-048	877.00
3499	3988	1	Upfl Coil	ECB45-15CB-P	111.00
3500	3988	2	Air Cond	ML14KP1-048-230	1789.00
3501	3989	0	Furnace	CBK45UHET-048	877.00
3502	3989	1	Upfl Coil	ECB45-20CB-P	134.00
3503	3989	2	Air Cond	ML14KP1-048-230	1789.00
3504	3990	0	Furnace	CBK45UHET-060	979.00
3505	3990	1	Upfl Coil	ECB45-20CB-P	134.00
3506	3990	2	Air Cond	ML14KP1-060-230	1972.00
3507	3991	0	Furnace	ML193UH090XE48C	694.00
3508	3991	1	Upfl Coil	CX35 49C 6F	323.00
3509	3991	2	Air Cond	ML17XP1042	1603.00
3510	3992	0	Indoor Unit	MMSZ-GS09NA	558.00
3511	3992	2	Heat Pump	MMUZ-GS09NA	1037.00
3512	3993	0	Indoor Unit	MMSZ-GS12NA	658.00
3513	3993	2	Heat Pump	MMUZ-GS12NA	1124.00
3514	3994	0	Indoor Unit	MMSZ-GS15NA	748.00
3515	3994	2	Heat Pump	MMUZ-GS15NA	1350.00
3516	3995	0	Indoor Unit	MMSZ-GS18NA	834.00
3517	3995	2	Heat Pump	MMUZ-GS18NA	1713.00
3518	3996	0	Indoor Unit	MMFZ-KJ18NA	1589.00
3519	3996	2	Heat Pump	MMUFZKJ18NAHZU1	1925.00
3520	3997	0	Indoor Unit	MSLZKF09NA	675.00
3521	3997	1	Coil	SLP-18FAU	180.00
3522	3997	2	Heat Pump	MSUZKA09NA	1070.00
3523	3997	3	Component 4	PARFL32MAE	66.00
3524	3998	0	Indoor Unit	FTXB 12 BXVJU	483.00
3525	3998	2	Heat Pump	RXB 12 BXVJU	876.00
3526	3998	4	Component 5	1/4x3/8/50	189.50
3527	3999	0	Indoor Unit	GSSHAX7487	235.00
3528	3999	2	Heat Pump	GSSHAX7488	235.00
3529	4000	0	Indoor Unit	GSSHAX7489	250.00
3530	4000	2	Heat Pump	GSSHAX7490	250.00
3531	4001	0	Indoor Unit	GSSHAX7493	350.00
3532	4001	2	Heat Pump	GSSHAX7494	350.00
3533	4002	0	Indoor Unit	GSSHAX7495	420.00
3534	4002	2	Heat Pump	GSSHAX7496	420.00
3535	4003	1	Coil	CAGL15AAG	498.00
3536	4003	2	Heat Pump	CTEV072BGD02CRT	10155.00
3537	4003	3	Component 4	Built-in	\N
3538	4003	4	Component 5	G1263	223.50
3539	4003	6	Component 7	CAUQSP2732	100.80
3540	4003	7	Stat	CATC32U02	316.50
3541	4004	0	Indoor Unit	CTAH026CGSMAS	2361.00
3542	4004	1	Coil	CAGM08AAG	283.50
3543	4004	2	Heat Pump	CTES026BGD02CNNS	5706.00
3544	4004	3	Component 4	Built-in	\N
3545	4004	4	Component 5	G1263	225.00
3546	4004	6	Component 7	CAUQSP2427	70.20
3547	4004	7	Stat	CATC32U02	316.50
3548	4005	1	Coil	CAGL15AAG	498.00
3549	4005	2	Heat Pump	CTEV038BGD02CRTS	8793.00
3550	4005	3	Component 4	Built-in	\N
3551	4005	4	Component 5	G1264	196.50
3552	4005	6	Component 7	CAUQSP2733	102.00
3553	4005	7	Stat	CATC32U03	316.50
3554	4006	0	Indoor Unit	CTAH026CGSMAS	2575.50
3555	4006	1	Coil	CAGM08AAG	295.50
3556	4006	2	Heat Pump	CTES026BGD02CNNS	5706.00
3557	4006	3	Component 4	Built-in	\N
3558	4006	4	Component 5	G1263	196.50
3559	4006	6	Component 7	CAUQSP2427	70.50
3560	4006	7	Stat	CATC32U03	316.50
3561	4007	1	Coil	CAGL10AAG	315.00
3562	4007	2	Heat Pump	CTEV064BGD02CRTS	10638.00
3563	4007	3	Component 4	Built-in	\N
3564	4007	4	Component 5	G1263	196.50
3565	4007	6	Component 7	GEO4055	99.00
3566	4007	7	Stat	CATC32U03	324.00
3567	4008	1	Coil	CAGL15AAG	511.56
3568	4008	2	Heat Pump	CTEV049BGD02CLTS	9972.00
3569	4008	3	Component 4	Built-in	\N
3570	4008	4	Component 5	G1263	196.86
3571	4008	6	Component 7	GEO4056	108.00
3572	4008	7	Stat	CATC32U03	324.51
3573	4009	0	Indoor Unit	CTAH038CGSMBS	2890.89
3574	4009	1	Coil	CAGL10CAG	329.73
3575	4009	2	Heat Pump	CTES038BGD02CNNS	6518.88
3576	4009	3	Component 4	Built-in	\N
3577	4009	4	Component 5	G1263	196.86
3578	4009	6	Component 7	GEO4056	108.00
3579	4009	7	Stat	CATC32U03	324.51
3580	4010	0	Indoor Unit	CTAH026CGSMAS	2576.61
3581	4010	1	Coil	CAGM08CAG	308.85
3582	4010	2	Heat Pump	CTES026BGD02ANNS	6628.29
3583	4010	3	Component 4	Built-in	\N
3584	4010	4	Component 5	G1263	196.86
3585	4010	6	Component 7	GEO4055	99.50
3586	4010	7	Stat	CATC32U03	324.51
3587	4011	1	Coil	CAGL15AAG	511.56
3588	4011	2	Heat Pump	CTEV049BGD02CLTS	9970.50
3589	4011	3	Component 4	Built-in	\N
3590	4011	4	Component 5	G1263	196.86
3591	4011	6	Component 7	GEO4056	108.00
3592	4011	7	Stat	CATC32U03	324.51
3593	4012	1	Coil	CAGM10AAG	308.85
3594	4012	2	Heat Pump	CTEV026BGD02CRTS	7998.00
3595	4012	3	Component 4	Built-in	\N
3596	4012	4	Component 5	G1263	196.50
3597	4012	6	Component 7	GEO4055	99.00
3598	4012	7	Stat	CATC32U03	324.51
3599	4013	1	Coil	CAGM10AAG	308.85
3600	4013	2	Heat Pump	CTEV26BGD02CRTS	8298.45
3601	4013	3	Component 4	Built-in	\N
3602	4013	4	Component 5	G1263	196.86
3603	4013	6	Component 7	GEO4055	99.50
3604	4013	7	Stat	CATC32U03	324.51
3605	4014	1	Coil	CAGL10AAG	322.77
3606	4014	2	Heat Pump	CTEV049BGD02CLTS	9971.91
3607	4014	3	Component 4	Built-in	\N
3608	4014	4	Component 5	G1263	196.86
3609	4014	6	Component 7	GEO4056	108.00
3610	4014	7	Stat	CATC32UO3	324.51
3611	4015	0	Indoor Unit	CTAH026CGSMAS	2576.61
3612	4015	1	Coil	CAGM08CAG	308.85
3613	4015	2	Heat Pump	CTE026BGD02CNNS	5878.98
3614	4015	3	Component 4	Built-in	\N
3615	4015	4	Component 5	G1263	196.86
3616	4015	6	Component 7	GEO4055	99.50
3617	4015	7	Stat	included	\N
3618	4016	0	Indoor Unit	CTAH026CGSMAS	2576.61
3619	4016	1	Coil	CAGM08AAG	295.80
3620	4016	2	Heat Pump	CTE026BGD02CNNS	5878.98
3621	4016	3	Component 4	Built-in	\N
3622	4016	4	Component 5	G1263	196.86
3623	4016	6	Component 7	GEO4055	99.50
3624	4016	7	Stat	included	\N
3625	4017	0	Indoor Unit	CTAH026CGSMAS	2576.61
3626	4017	1	Coil	CAGM08CAG	308.85
3627	4017	2	Heat Pump	CTE026BGD02CNNS	5878.98
3628	4017	3	Component 4	Built-in	\N
3629	4017	4	Component 5	G1263	196.86
3630	4017	6	Component 7	GEO4055	99.50
3631	4017	7	Stat	included	\N
3632	4018	1	Coil	CAGM08AAG	326.99
3633	4018	2	Heat Pump	CTEV026BGD02ART	8117.47
3634	4018	3	Component 4	Built-in	\N
3635	4018	4	Component 5	G1263	196.86
3636	4018	6	Component 7	GEO4027	99.50
3637	4018	7	Stat	CAWC99B01R	390.00
3638	4019	0	Indoor Unit	CTAH049CGSMBS	3369.00
3639	4019	1	Coil	CAGL10CAG	364.45
3640	4019	2	Heat Pump	CTES049BGD02ANNS	7026.70
3641	4019	3	Component 4	Built-in	\N
3642	4019	4	Component 5	G1263	196.86
3643	4019	6	Component 7	GEO4028	108.00
3644	4019	7	Stat	CAWC99B01R	390.00
3645	4020	0	Indoor Unit	CTAH026CGSMAS	2731.50
3646	4020	1	Coil	CAGM08CAG	341.38
3647	4020	2	Heat Pump	CTES026BGD02ANNS	5918.43
3648	4020	3	Component 4	Built-in	\N
3649	4020	4	Component 5	G1263	196.86
3650	4020	6	Component 7	GEO4027	99.50
3651	4020	7	Stat	CAWC99B01R	390.00
3652	4021	0	Indoor Unit	TS9X1B040U3PSBA	1657.00
3653	4021	1	Coil	T4PXCBU24BS3HAB	356.00
3654	4021	2	Heat Pump	T4TTR4018N1000A	1031.00
3655	4022	0	Indoor Unit	TS9X1B060U4PSBA	1736.00
3656	4022	1	Coil	T4PXCBU36BS3HAC	399.00
3657	4022	2	Heat Pump	T4TTR4036N1000B	1213.00
3658	4023	0	Indoor Unit	TTEM4B0B24M21SA	639.00
3659	4023	1	Coil	TUTBAYHTR1508BRK	96.00
3660	4023	2	Heat Pump	T4TWR4024N	1272.00
3661	4024	0	Indoor Unit	TTEM8A0B24V21DC	1290.00
3662	4024	1	Coil	TUTBAYHTR1505BRK	77.00
3663	4024	2	Heat Pump	T4TWV8X24A1000A	3226.00
3664	4024	3	Component 4	TTCONT850AC52UB	262.00
3665	4025	0	Indoor Unit	TTEM8A0C36V31DC	1527.00
3666	4025	1	Coil	TUTBAYHTR1510BRK	98.00
3667	4025	2	Heat Pump	T4TWV8X36A1000A	3624.00
3668	4025	3	Component 4	TTCONT850AC52UB	262.00
3669	4026	0	Furnace	R921V0403A17M4SCAP	929.00
3670	4026	1	Coil w/TXV	RCFY2417STANMC	316.00
3671	4026	2	Air Cond	RA14AY18AJ1NA	953.00
3672	4027	0	Furnace	R921T0403A17M4SNAS	851.00
3673	4027	1	Coil w/TXV	RCFY2417STANMC	316.00
3674	4027	2	Air Cond	RA14AY24AJ1NA	951.00
3675	4028	0	Furnace	R921T0403A17M4SNAS	851.00
3676	4028	1	Coil w/TXV	RCFY3617STANMC	357.00
3677	4028	2	Air Cond	RA14AY30AJ1NA	1060.00
3678	4029	0	Furnace	R921T0603A17M4SNAS	898.00
3679	4029	1	Coil w/TXV	RCFY2417STANMC	316.00
3680	4029	2	Air Cond	RA14AY24AJ1NA	951.00
3681	4030	0	Furnace	R921T0603A17M4SNAS	898.00
3682	4030	1	Coil w/TXV	RCFY3617STANMC	357.00
3683	4030	2	Air Cond	RA14AY30AJ1NA	1060.00
3684	4031	0	Furnace	R921T0603A17M4SNAS	898.00
3685	4031	1	Coil w/TXV	RCFY3621MTANMC	527.00
3686	4031	2	Air Cond	RA14AY36AJ1NA	1222.00
3687	4032	0	Furnace	R921T1005A21M4SNAS	1022.00
3688	4032	1	Coil w/TXV	RCFY3621MTANMC	527.00
3689	4032	2	Air Cond	RA14AY36AJ1NA	1222.00
3690	4033	0	Furnace	R921T1005A21M4SNAS	1022.00
3691	4033	1	Coil w/TXV	RCFY4821STANMC	637.00
3692	4033	2	Air Cond	RA14AY42AJ1NA	1365.00
3693	4034	0	Furnace	R921T1005A21M4SNAS	1022.00
3694	4034	1	Coil w/TXV	RCFY4821STANMC	637.00
3695	4034	2	Air Cond	RA14AY48AJ1NA	1466.00
3696	4035	0	Furnace	R921T1005A21M4SNAS	1022.00
3697	4035	1	Coil w/TXV	RCFY6024STANMC	603.00
3698	4035	2	Air Cond	RA14AY60AJ1NA	1717.00
3699	4036	0	Furnace	R921T1155A24M4SNAS	1094.00
3700	4036	1	Coil w/TXV	RCFY6024STANMC	603.00
3701	4036	2	Air Cond	RA14AY60AJ1NA	1717.00
3702	4037	0	Furnace	RH2TY2417STANNJ	650.00
3703	4037	1	Coil w/TXV	RXBH1724A05JB	98.00
3704	4037	2	Air Cond	RP14AY18AJ1NA	1141.00
3705	4038	0	Furnace	RH2TY2417STANNJ	650.00
3706	4038	1	Coil w/TXV	RXBH1724A07JB	125.00
3707	4038	2	Air Cond	RP14AY18AJ1NA	1141.00
3708	4039	0	Furnace	RH2TY2417STANNJ	650.00
3709	4039	1	Coil w/TXV	RXBH1724A07JB	125.00
3710	4039	2	Air Cond	RP14AY24AJ2NA	1202.00
3711	4040	0	Furnace	RH2TY2417STANNJ	650.00
3712	4040	1	Coil w/TXV	RXBH1724A10JB	125.00
3713	4040	2	Air Cond	RP14AY24AJ2NA	1202.00
3714	4041	0	Furnace	RH2TY3617STANNJ	722.00
3715	4041	1	Coil w/TXV	RXBH1724A07JB	125.00
3716	4041	2	Air Cond	RP14AY30AJ2NA	1269.00
3717	4042	0	Furnace	RH2TY3617STANNJ	722.00
3718	4042	1	Coil w/TXV	RXBH1724A10JB	125.00
3719	4042	2	Air Cond	RP14AY30AJ2NA	1269.00
3720	4043	0	Furnace	RH2TY3617STANNJ	722.00
3721	4043	1	Coil w/TXV	RXBH1724A15JB	188.00
3722	4043	2	Air Cond	RP14AY30AJ2NA	1269.00
3723	4044	0	Furnace	RH2TY3617STANNJ	722.00
3724	4044	1	Coil w/TXV	RXBH1724A10JB	125.00
3725	4044	2	Air Cond	RP14AY36AJ2NA	1403.00
3726	4045	0	Furnace	RH2TY3617STANNJ	722.00
3727	4045	1	Coil w/TXV	RXBH1724A15JB	188.00
3728	4045	2	Air Cond	RP14AY36AJ2NA	1403.00
3729	4046	0	Furnace	RH2TY4821STANNJ	908.00
3730	4046	1	Coil w/TXV	RXBH1724A15JB	188.00
3731	4046	2	Air Cond	RP14AY42AJ2NA	1519.00
3732	4047	0	Furnace	RH2TY4821STANNJ	908.00
3733	4047	1	Coil w/TXV	RXBH24A20JB	225.00
3734	4047	2	Air Cond	RP14AY42AJ2NA	1519.00
3735	4048	0	Furnace	RH2TY4821STANNJ	908.00
3736	4048	1	Coil w/TXV	RXBH1724A15JB	188.00
3737	4048	2	Air Cond	RP14AY48AJ2NA	1729.00
3738	4049	0	Furnace	RH2TY4821STANNJ	908.00
3739	4049	1	Coil w/TXV	RXBH24A20JB	225.00
3740	4049	2	Air Cond	RP14AY48AJ2NA	1729.00
3741	4050	0	Furnace	RH2TY6024STANNJ	1150.00
3742	4050	1	Coil w/TXV	RXBH24A20JB	225.00
3743	4050	2	Air Cond	RP14AY60AJ2NA	2103.00
3744	4051	0	Furnace	RH2TY2417STANNJ	650.00
3745	4051	1	Coil w/TXV	RXBH1724A05JB	98.00
3746	4051	2	Air Cond	RP15AY18AJ2NA	1665.00
3747	4052	0	Furnace	RH2TY2417STANNJ	650.00
3748	4052	1	Coil w/TXV	RXBH1724A07JB	125.00
3749	4052	2	Air Cond	RP15AY18AJ2NA	1665.00
3750	4053	0	Furnace	RH2TY2417STANNJ	650.00
3751	4053	1	Coil w/TXV	RXBH1724A07JB	125.00
3752	4053	2	Air Cond	RP15AY24AJ2NA	1460.00
3753	4054	0	Furnace	RH2TY2417STANNJ	650.00
3754	4054	1	Coil w/TXV	RXBH1724A10JB	125.00
3755	4054	2	Air Cond	RP15AY24AJ2NA	1460.00
3756	4055	0	Furnace	RH2TY3617STANNJ	722.00
3757	4055	1	Coil w/TXV	RXBH1724A07JB	125.00
3758	4055	2	Air Cond	RP15AY30AJ2NA	1659.00
3759	4056	0	Furnace	RH2TY3617STANNJ	722.00
3760	4056	1	Coil w/TXV	RXBH1724A10JB	125.00
3761	4056	2	Air Cond	RP15AY30AJ2NA	1659.00
3762	4057	0	Furnace	RH2TY3617STANNJ	722.00
3763	4057	1	Coil w/TXV	RXBH1724A15JB	188.00
3764	4057	2	Air Cond	RP15AY30AJ2NA	1659.00
3765	4058	0	Furnace	RH2TY3617STANNJ	722.00
3766	4058	1	Coil w/TXV	RXBH1724A10JB	125.00
3767	4058	2	Air Cond	RP15AY36AJ2NA	1845.00
3768	4059	0	Furnace	RH2TY3617STANNJ	722.00
3769	4059	1	Coil w/TXV	RXBH1724A15JB	188.00
3770	4059	2	Air Cond	RP15AY36AJ2NA	1845.00
3771	4060	0	Furnace	RH2TY4821STANNJ	908.00
3772	4060	1	Coil w/TXV	RXBH1724A15JB	188.00
3773	4060	2	Air Cond	RP15AY42AJ2NA	2077.00
3774	4061	0	Furnace	RH2TY4821STANNJ	908.00
3775	4061	1	Coil w/TXV	RXBH24A20JB	225.00
3776	4061	2	Air Cond	RP15AY42AJ2NA	2077.00
3777	4062	0	Furnace	RH2TY4821STANNJ	908.00
3778	4062	1	Coil w/TXV	RXBH1724A15JB	188.00
3779	4062	2	Air Cond	RP15AY48AJ2NA	2080.00
3780	4063	0	Furnace	RH2TY4821STANNJ	908.00
3781	4063	1	Coil w/TXV	RXBH24A20JB	225.00
3782	4063	2	Air Cond	RP15AY48AJ2NA	2080.00
3783	4064	0	Furnace	RH2TY6024STANNJ	1150.00
3784	4064	1	Coil w/TXV	RXBH24A20JB	225.00
3785	4064	2	Air Cond	RP15AY60AJ2NA	2386.00
3786	4065	0	Furnace	R962V0403A17M4SCAP	1450.00
3787	4065	1	Coil w/TXV	RCFY3617STANMC	357.00
3788	4065	2	Air Cond	RP15AY30AJ2NA	1659.00
3789	4066	0	Furnace	R962V0403A17M4SCAP	1450.00
3790	4066	1	Coil w/TXV	RCFY3617STANMC	357.00
3791	4066	2	Air Cond	RP15AY30AJ2NA	1659.00
3792	4067	0	Furnace	R962V0403A17M4SCAP	1450.00
3793	4067	1	Coil w/TXV	RCFY2417STANMC	316.00
3794	4067	2	Air Cond	RA15AY24AJ1Na	1226.00
3795	4068	0	FURNACE	TS9V2B060U3PSBB	1194.35
3796	4068	1	COIL	T4TXCB003DS3HCA	289.88
3797	4068	2	AIR COND	T4TTR7024A1000B	1290.35
3798	4069	0	FURNACE	TS9V2B060U3PSBB	1194.35
3799	4069	1	COIL	T4TXCB004DS3HCA	289.88
3800	4069	2	AIR COND	T4TTR7036A1000B	1498.35
3801	4070	0	FURNACE	TTEM6A0B30H21SB	945.92
3802	4070	1	COIL	TUTBAYHTR1510BRK	81.45
3803	4070	2	AIR COND	T4TWR5030H1000A	1565.40
3804	4071	0	FURNACE	TTEM6A0B24H21SB	649.41
3805	4071	1	COIL	TUTBAYHTR1508BRK	67.67
3806	4071	2	AIR COND	T4TWR7024A1000D	1623.53
3807	4072	0	FURNACE	TTEM6A0B30H21SB	945.92
3808	4072	1	COIL	TUTBAYHTR1510BRK	81.45
3809	4072	2	AIR COND	T4TWR5030H1000A	1565.40
\.


--
-- Data for Name: equipment_manufacturers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment_manufacturers (id, code, name) FROM stdin;
22	CARRIER	Carrier
23	COMFORTMAKER	Comfortmaker
24	DAIKIN	Daikin
25	FUJITSU	Fujitsu
26	GOODMAN	Goodman
27	LENNOX	Lennox
28	MISC	Miscellaneous
29	RHEEM	Rheem
30	TRANE	Trane
\.


--
-- Data for Name: equipment_systems; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment_systems (id, manufacturer_id, system_code, description, component_cost, bid_price, effective_date, retired_date) FROM stdin;
3646	22	CG 70F 2.5S214R454	Carrier Comfort Series ( 80%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner	1410.00	1494.60	2026-03-26	\N
3647	22	CG 90F 3.5S214R454	Carrier Comfort Series ( 80%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner	1750.00	1855.00	2026-03-26	\N
3648	22	CG9+ 40F 1.5S214R454	Carrier Comfort Series ( 92%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner (R-454B)	1479.00	1567.74	2026-03-26	\N
3649	22	CG9+ 40F 2S214R454	Carrier Comfort Series ( 92%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner (R-454B)	1509.00	1599.54	2026-03-26	\N
3650	22	CG9+ 40F 2.5S214R454	CG9+ 40F 2.5S214R454	1596.00	1691.76	2026-03-26	\N
3651	22	CG9+ 60F 2S214R454	CG9+ 60F 2S214R454	1605.00	1701.30	2026-03-26	\N
3652	22	CG9+ 60F 2.5S214R454	CG9+ 60F 2.5S214R454	1692.00	1793.52	2026-03-26	\N
3653	22	CG9+ 60F 3S214R454	CG9+ 60F 3S214R454	1774.00	1880.44	2026-03-26	\N
3654	22	CG9+ 80F 3S214R454	CG9+ 80F 3S214R454	1787.00	1894.22	2026-03-26	\N
3655	22	CG9+ 80F 3.5S214R454	CG9+ 80F 3.5S214R454	2020.00	2141.20	2026-03-26	\N
3656	22	CG9+ 80F 4S214R454	CG9+ 80F 4S214R454	2122.00	2249.32	2026-03-26	\N
3657	22	CG9+ 80F 5S214R454	CG9+ 80F 5S214R454	2275.00	2411.50	2026-03-26	\N
3658	22	CG9+100F 3.5S214R454	CG9+100F 3.5S214R454	2076.00	2200.56	2026-03-26	\N
3659	22	CG9+100F 4S214R454	CG9+100F 4S214R454	2178.00	2308.68	2026-03-26	\N
3660	22	CG9+100F 5S214R454	CG9+100F 5S214R454	2331.00	2470.86	2026-03-26	\N
3661	22	CG9+120F 4S214R454	CG9+120F 4S214R454	2192.00	2323.52	2026-03-26	\N
3662	22	CG9+120F 5S214R454	CG9+120F 5S214R454	2345.00	2485.70	2026-03-26	\N
3663	22	CHP 5CB 1.5S214R454	Carrier Base ( Upfl, Horiz, Dnfl ) (R454) Air Handler with circuit Breaker Heater  Base Series 14.3 SEER2 Heat Pump	1573.00	1667.38	2026-03-26	\N
3664	22	CHP 8CB 1.5S214R454	Carrier Base ( Upfl, Horiz, Dnfl ) (R454) Air Handler with circuit Breaker Heater  Base Series 14.3 SEER2 Heat Pump	1594.00	1689.64	2026-03-26	\N
3665	22	CHP 10CB 1.5S214R454	CHP 10CB 1.5S214R454	1602.00	1698.12	2026-03-26	\N
3666	22	CHP 5CB 2S214R454	CHP 5CB 2S214R454	1593.00	1688.58	2026-03-26	\N
3667	22	CHP 8CB 2S214R454	CHP 8CB 2S214R454	1614.00	1710.84	2026-03-26	\N
3668	22	CHP 10CB 2S214R454	CHP 10CB 2S214R454	1622.00	1719.32	2026-03-26	\N
3669	22	CHP 15CB 2S214R454	CHP 15CB 2S214R454	1723.00	1826.38	2026-03-26	\N
3670	22	CHP 10CB 2.5S214R454	CHP 10CB 2.5S214R454	1773.00	1879.38	2026-03-26	\N
3671	22	CHP 15CB 2.5S214R454	CHP 15CB 2.5S214R454	1874.00	1986.44	2026-03-26	\N
3672	22	CHP 10CB 3S214R454	CHP 10CB 3S214R454	1959.00	2076.54	2026-03-26	\N
3673	22	CHP 15CB 3S214R454	CHP 15CB 3S214R454	2060.00	2183.60	2026-03-26	\N
3674	22	CHP 20CB 3S214R454	CHP 20CB 3S214R454	2125.00	2252.50	2026-03-26	\N
3675	22	CHP 10CB 3.5S214R454	CHP 10CB 3.5S214R454	2126.00	2253.56	2026-03-26	\N
3676	22	CHP 15CB 3.5S214R454	CHP 15CB 3.5S214R454	2227.00	2360.62	2026-03-26	\N
3677	22	CHP 20CB 3.5S214R454	CHP 20CB 3.5S214R454	2292.00	2429.52	2026-03-26	\N
3678	22	CHP 15CB 4S214R454	CHP 15CB 4S214R454	2371.00	2513.26	2026-03-26	\N
3679	22	CHP 20CB 4S214R454	CHP 20CB 4S214R454	2436.00	2582.16	2026-03-26	\N
3680	22	CHP 15CB 5S214R454	CHP 15CB 5S214R454	2591.00	2746.46	2026-03-26	\N
3681	22	CHP 20CB 5S214R454	CHP 20CB 5S214R454	2656.00	2815.36	2026-03-26	\N
3682	22	CHPC8CB1.5S215CR454	Carrier Comfort ( Upfl, Horiz, Dnfl ) (R454) Air Handler with circuit Breaker Heater  Comfort Series 15.0 SEER2 Heat Pump	2020.00	2141.20	2026-03-26	\N
3683	22	CHPC8CB2S215CR454	Carrier Comfort ( Upfl, Horiz, Dnfl ) (R454) Air Handler with circuit Breaker Heater  Comfort Series 15.0 SEER2 Heat Pump	2071.00	2195.26	2026-03-26	\N
3684	22	CHPC10CB2.5S215CR454	CHPC10CB2.5S215CR454	2378.00	2520.68	2026-03-26	\N
3685	22	CHPC15CB2.5S215CR454	CHPC15CB2.5S215CR454	2479.00	2627.74	2026-03-26	\N
3686	22	CHPC10CB3S215CR454	CHPC10CB3S215CR454	2507.00	2657.42	2026-03-26	\N
3687	22	CHPP8CB1.5S216PR454	Carrier Performance ( Upfl, Horiz, Dnfl ) (R454) Air Handler with circuit Breaker Heater Performance Series 16.0 SEER2 Heat Pump	3243.00	3437.58	2026-03-26	\N
3688	22	CHPP8CB2S216PR454	Carrier Performance ( Upfl, Horiz, Dnfl ) (R454) Air Handler with circuit Breaker Heater Performance Series 16.0 SEER2 Heat Pump	3297.00	3494.82	2026-03-26	\N
3689	22	CHPP10CB2.5S216PR454	CHPP10CB2.5S216PR454	3643.00	3861.58	2026-03-26	\N
3690	22	CHPP15CB2.5S216PR454	CHPP15CB2.5S216PR454	3744.00	3968.64	2026-03-26	\N
3691	22	CHPP10CB3S216PR454	CHPP10CB3S216PR454	3773.00	3999.38	2026-03-26	\N
3692	22	CG9+CSSHP 60F 1.5S214R454	Carrier Comfort Series ( 92% ) Fer Furnace with Comfort Series 14.3/16  Heat Pump Dual Fuel	2402.00	2546.12	2026-03-26	\N
3693	22	CG9+CSSHP 60F 2S214R454	Carrier Comfort Series ( 92% ) Fer Furnace with Comfort Series 14.3/16  Heat Pump Dual Fuel	2493.00	2642.58	2026-03-26	\N
3694	22	CG9+CSSHP 60F 2.5S214R454	CG9+CSSHP 60F 2.5S214R454	2853.00	3024.18	2026-03-26	\N
3695	22	CG9+CSSHP 60F 3S214R454	CG9+CSSHP 60F 3S214R454	2945.00	3121.70	2026-03-26	\N
3696	22	CG9+CSSHP 80F 3.5S214R454	CG9+CSSHP 80F 3.5S214R454	3246.00	3440.76	2026-03-26	\N
3697	22	CG9+CSSHP 80F 4S214R454	CG9+CSSHP 80F 4S214R454	3813.00	4041.78	2026-03-26	\N
3698	22	CG9+CSSHP100F 3.5S214R454	CG9+CSSHP100F 3.5S214R454	3302.00	3500.12	2026-03-26	\N
3699	22	CG9+CSSHP100F 4S214R454	CG9+CSSHP100F 4S214R454	3869.00	4101.14	2026-03-26	\N
3700	22	CG96TSVS401.5S214R454	Carrier Performance Series (96%) Two Stage Furnace with Base Series 14.3 SEER2 Air Conditioner (R-454B)	2957.00	3134.42	2026-03-26	\N
3701	22	CG96TSVS402S214R454	Carrier Performance Series (96%) Two Stage Furnace with Base Series 14.3 SEER2 Air Conditioner (R-454B)	3019.00	3200.14	2026-03-26	\N
3702	22	CG96TSVS402.5S214R454	CG96TSVS402.5S214R454	3106.00	3292.36	2026-03-26	\N
3703	22	CG96TSVS602S214R454	CG96TSVS602S214R454	3161.00	3350.66	2026-03-26	\N
3704	22	CG96TSVS602.5S214R454	CG96TSVS602.5S214R454	3148.00	3336.88	2026-03-26	\N
3705	22	CG96TSVS603S214R454	CG96TSVS603S214R454	3241.00	3435.46	2026-03-26	\N
3706	22	CG96TSVS803S214R454	CG96TSVS803S214R454	3260.00	3455.60	2026-03-26	\N
3707	22	CGH96TSVS402S214R454	Carrier Performance Series (96%) Two Stage Furnace with Base Series 14.3 SEER2 Air Conditioner (R-454B)	3115.00	3301.90	2026-03-26	\N
3708	22	CGH96TSVS402.5S214R454	CGH96TSVS402.5S214R454	3236.00	3430.16	2026-03-26	\N
3709	22	CGH96TSVS602S214R454	CGH96TSVS602S214R454	3157.00	3346.42	2026-03-26	\N
3710	22	CGH96TSVS602.5S214R454	CGH96TSVS602.5S214R454	3278.00	3474.68	2026-03-26	\N
3711	22	CGH96TSVS603S214R454	CGH96TSVS603S214R454	3339.00	3539.34	2026-03-26	\N
3712	22	CGH96TSVS803S214R454	CGH96TSVS803S214R454	3358.00	3559.48	2026-03-26	\N
3713	22	CG96TSVS401.5S215CR454	Carrier Performance Series (96%) Two Stage Furnace with Comfort Series 14.3/15.2 SEER2 Air Conditioner (R-454B)	3372.00	3574.32	2026-03-26	\N
3714	22	CG96TSVS402S215CR454	Carrier Performance Series (96%) Two Stage Furnace with Comfort Series 14.3/15.2 SEER2 Air Conditioner (R-454B)	3432.00	3637.92	2026-03-26	\N
3715	22	CG96TSVS402.5S215CR454	CG96TSVS402.5S215CR454	3568.00	3782.08	2026-03-26	\N
3716	22	CG96TSVS602S215CR454	CG96TSVS602S215CR454	3574.00	3788.44	2026-03-26	\N
3717	22	CG96TSVS602.5S215CR454	CG96TSVS602.5S215CR454	3610.00	3826.60	2026-03-26	\N
3718	22	CG96TSVS603S215CR454	CG96TSVS603S215CR454	3840.00	4070.40	2026-03-26	\N
3719	22	CG96TSVS803S215CR454	CG96TSVS803S215CR454	3859.00	4090.54	2026-03-26	\N
3720	22	CGH96TSVS402S215CR454	Carrier Performance Series (96%) Two Stage Furnace with Comfort Series 14.3/15.2 SEER2 Air Conditioner (R-454B)	3528.00	3739.68	2026-03-26	\N
3721	22	CGH96TSVS402.5S215CR454	CGH96TSVS402.5S215CR454	3698.00	3919.88	2026-03-26	\N
3722	22	CGH96TSVS602S215CR454	CGH96TSVS602S215CR454	3570.00	3784.20	2026-03-26	\N
3723	22	CGH96TSVS602.5S215CR454	CGH96TSVS602.5S215CR454	3740.00	3964.40	2026-03-26	\N
3724	22	CGH96TSVS603S215CR454	CGH96TSVS603S215CR454	3938.00	4174.28	2026-03-26	\N
3725	22	CGH96TSVS803S215CR454	CGH96TSVS803S215CR454	3957.00	4194.42	2026-03-26	\N
3726	22	CG96TSVS401.5S216PR454	Carrier Performance Series (96%) Two Stage Furnace with Performance Series 16.5 SEER2 Air Conditioner (R-454B)	4919.00	5214.14	2026-03-26	\N
3727	22	CG96TSVS402S216PR454	Carrier Performance Series (96%) Two Stage Furnace with Performance Series 16.5 SEER2 Air Conditioner (R-454B)	5048.00	5350.88	2026-03-26	\N
3728	22	CG96TSVS402.5S216PR454	CG96TSVS402.5S216PR454	5317.00	5636.02	2026-03-26	\N
3729	22	CG96TSVS602S216PR454	CG96TSVS602S216PR454	5190.00	5501.40	2026-03-26	\N
3730	22	CG96TSVS602.5S216PR454	CG96TSVS602.5S216PR454	5359.00	5680.54	2026-03-26	\N
3731	22	CG96TSVS603S216PR454	CG96TSVS603S216PR454	5705.00	6047.30	2026-03-26	\N
3732	22	CG96TSVS803S216PR454	CG96TSVS803S216PR454	5724.00	6067.44	2026-03-26	\N
3733	22	CGH96TSVS401.5S216PR454	Carrier Performance Series (96%) Two Stage Furnace with Base Series 14.3 SEER2 Air Conditioner (R-454B)	2041.00	2668.00	2026-03-26	\N
3734	22	CGH96TSVS402S216PR454	Carrier Performance Series (96%) Two Stage Furnace with Base Series 14.3 SEER2 Air Conditioner (R-454B)	5144.00	5452.64	2026-03-26	\N
3735	22	CGH96TSVS402.5S216PR454	CGH96TSVS402.5S216PR454	5447.00	5773.82	2026-03-26	\N
3736	22	CGH96TSVS602S216PR454	CGH96TSVS602S216PR454	5186.00	5497.16	2026-03-26	\N
3737	22	CGH96TSVS602.5S216PR454	CGH96TSVS602.5S216PR454	5489.00	5818.34	2026-03-26	\N
3738	22	CGH96TSVS603S216PR454	CGH96TSVS603S216PR454	5803.00	6151.18	2026-03-26	\N
3739	22	CGH96TSVS803S216PR454	CGH96TSVS803S216PR454	5822.00	6171.32	2026-03-26	\N
3740	23	SG 45 2.B14	COMFORTMAKER ( 80%)  Furnace W/Base 14  Air Conditioner	965.00	1022.90	2026-03-26	\N
3741	23	SG 45 2.5B14	COMFORTMAKER ( 80%)  Furnace W/Base 14  Air Conditioner	1032.00	1093.92	2026-03-26	\N
3742	23	SG 45 3B14	SG 45 3B14	1082.00	1146.92	2026-03-26	\N
3743	23	SG 70 2B14	SG 70 2B14	971.00	1029.26	2026-03-26	\N
3744	23	SG 70 2.5B14	SG 70 2.5B14	1038.00	1100.28	2026-03-26	\N
3745	23	SG 70 3B14	SG 70 3B14	1088.00	1153.28	2026-03-26	\N
3746	23	SG 70 3.25B14	SG 70 3.25B14	1094.00	1159.64	2026-03-26	\N
3747	23	SG 70 3.5B14	SG 70 3.5B14	1197.00	1268.82	2026-03-26	\N
3748	23	SG 70 4B14	SG 70 4B14	1276.00	1352.56	2026-03-26	\N
3749	23	SG 90 3B14	SG 90 3B14	1118.00	1185.08	2026-03-26	\N
3750	23	SG 90 3.5B14	SG 90 3.5B14	1221.00	1294.26	2026-03-26	\N
3751	23	SG 90 4B14	SG 90 4B14	1324.00	1403.44	2026-03-26	\N
3752	23	SG 90 5B14	SG 90 5B14	1442.00	1528.52	2026-03-26	\N
3753	23	SG110 4B14	SG110 4B14	1342.00	1422.52	2026-03-26	\N
3754	23	SG110 5B14	SG110 5B14	1460.00	1547.60	2026-03-26	\N
3755	23	SGH 70 2.5B14	COMFORTMAKER ( 80%)  Horiz Furnace W/B14 Air Condition	1084.00	1149.04	2026-03-26	\N
3756	23	SG9+ 40 1.75B14	COMFORTMAKER ( 92%)  Furnace w/Base 14 Air Conditioner	1107.00	1173.42	2026-03-26	\N
3757	23	SG9+ 40 2B14	COMFORTMAKER ( 92%)  Furnace w/Base 14 Air Conditioner	1146.00	1214.76	2026-03-26	\N
3758	23	SG9+ 40 2.25B14	SG9+ 40 2.25B14	1146.00	1214.76	2026-03-26	\N
3759	23	SG9+ 60 2B14	SG9+ 60 2B14	1184.00	1255.04	2026-03-26	\N
3760	23	SG9+ 60 2.25B14	SG9+ 60 2.25B14	1200.00	1272.00	2026-03-26	\N
3761	23	SG9+ 60 2.5B14	SG9+ 60 2.5B14	1251.00	1326.06	2026-03-26	\N
3762	23	SG9+ 60 2.75B14	SG9+ 60 2.75B14	1271.00	1347.26	2026-03-26	\N
3763	23	SG9+ 60 3B14	SG9+ 60 3B14	1304.00	1382.24	2026-03-26	\N
3764	23	SG9+ 60 3.5B14	SG9+ 60 3.5B14	1407.00	1491.42	2026-03-26	\N
3765	23	SG9+ 80 3B14	SG9+ 80 3B14	1333.00	1412.98	2026-03-26	\N
3766	23	SG9+ 80 3.5B14	SG9+ 80 3.5B14	1436.00	1522.16	2026-03-26	\N
3767	23	SG9+ 80 4B14	SG9+ 80 4B14	1521.00	1612.26	2026-03-26	\N
3768	23	SG9+100 3.5B14	SG9+100 3.5B14	1466.00	1553.96	2026-03-26	\N
3769	23	SG9+100 4B14	SG9+100 4B14	1545.00	1637.70	2026-03-26	\N
3770	23	SG9+120 5B14	SG9+120 5B14	1710.00	1812.60	2026-03-26	\N
3771	23	SGH9+ 60 2.5B14	COMFORTMAKER ( 92%) Horiz Furnace W/Base 14 Air Conditioner	1297.00	1374.82	2026-03-26	\N
3772	23	SG9+ 40 1.75B16	COMFORTMAKER  (96%ecm Motor Furnace) w/Base Series 16 Air Conditioner	1414.00	1498.84	2026-03-26	\N
3773	23	SG9+ 40 2B16	COMFORTMAKER  (96%ecm Motor Furnace) w/Base Series 16 Air Conditioner	1426.00	1511.56	2026-03-26	\N
3774	23	SG9+ 60 2B16	SG9+ 60 2B16	1441.00	1527.46	2026-03-26	\N
3775	23	SG9+ 60 2.5B16	SG9+ 60 2.5B16	1515.00	1605.90	2026-03-26	\N
3776	23	SG9+ 60 3B16	SG9+ 60 3B16	1645.00	1743.70	2026-03-26	\N
3777	23	SG9+ 80 3B16	SG9+ 80 3B16	1762.00	1867.72	2026-03-26	\N
3778	23	SG9+ 80 3.5B16	SG9+ 80 3.5B16	1899.00	2012.94	2026-03-26	\N
3779	23	SG9+ 80 4B16	SG9+ 80 4B16	2057.00	2180.42	2026-03-26	\N
3780	23	SG9+100 3.5B16	SG9+100 3.5B16	1903.00	2017.18	2026-03-26	\N
3781	23	SG9+100 4B16	SG9+100 4B16	2061.00	2184.66	2026-03-26	\N
3782	23	SG9+100 5B16	SG9+100 5B16	2253.00	2388.18	2026-03-26	\N
3783	23	SHP  5 1.5B14	COMFORTMAKER  Upflow  Base 14 Heat Pumps	1056.00	1119.36	2026-03-26	\N
3784	23	SHP7.5 1.5B14	COMFORTMAKER  Upflow  Base 14 Heat Pumps	1064.00	1127.84	2026-03-26	\N
3785	23	SHP7.5 2.25B14	SHP7.5 2.25B14	1191.00	1262.46	2026-03-26	\N
3786	23	SHP 10 2.25B14	SHP 10 2.25B14	1198.00	1269.88	2026-03-26	\N
3787	23	SHP7.5 2.5B14	SHP7.5 2.5B14	1262.00	1337.72	2026-03-26	\N
3788	23	SHP 10 2.5B14	SHP 10 2.5B14	1269.00	1345.14	2026-03-26	\N
3789	23	SHP 15 2.5B14	SHP 15 2.5B14	1294.00	1371.64	2026-03-26	\N
3790	23	SHP 10 3B14	SHP 10 3B14	1338.00	1418.28	2026-03-26	\N
3791	23	SHP 15 3B14	SHP 15 3B14	1363.00	1444.78	2026-03-26	\N
3792	23	SHP 20 3B14	SHP 20 3B14	1380.00	1462.80	2026-03-26	\N
3793	23	SHP 15 3.5B14	SHP 15 3.5B14	1441.00	1527.46	2026-03-26	\N
3794	23	SHP 20 3.5B14	SHP 20 3.5B14	1458.00	1545.48	2026-03-26	\N
3795	23	SHP 15 4B14	SHP 15 4B14	1597.00	1692.82	2026-03-26	\N
3796	23	SHP 20 4B14	SHP 20 4B14	1614.00	1710.84	2026-03-26	\N
3797	23	SHP 25 4B14	SHP 25 4B14	1664.00	1763.84	2026-03-26	\N
3798	23	SHP 20 5B14	SHP 20 5B14	1768.00	1874.08	2026-03-26	\N
3799	23	SHP 25 5B14	SHP 25 5B14	1818.00	1927.08	2026-03-26	\N
3800	23	SG9+HP040 1.5B14A	COMFORTMAKER Dual Fuel (96%ecm Motor Furnace) w/Base Series 14 Heat Pump	1380.00	1462.80	2026-03-26	\N
3801	23	SG9+HP060 2B14A	COMFORTMAKER Dual Fuel (96%ecm Motor Furnace) w/Base Series 14 Heat Pump	1418.00	1503.08	2026-03-26	\N
3802	23	SG9+HP060 2.5B14A	SG9+HP060 2.5B14A	1535.00	1627.10	2026-03-26	\N
3803	23	SG9+HP060 3B14A	SG9+HP060 3B14A	1691.00	1792.46	2026-03-26	\N
3804	23	SG9+HP080 3B14A	SG9+HP080 3B14A	1808.00	1916.48	2026-03-26	\N
3805	23	SG9+HP080 3.5B14A	SG9+HP080 3.5B14A	1854.00	1965.24	2026-03-26	\N
3806	23	SG9+HP080 4B14A	SG9+HP080 4B14A	2109.00	2235.54	2026-03-26	\N
3807	23	SG9+HP100 4B14A	SG9+HP100 4B14A	2189.00	2320.34	2026-03-26	\N
3808	23	SGH9+HP040 2B14A	COMFORTMAKER Dual Fuel (96%ecm Motor Furnace) Horiz w/Base Series Heat Pumps	1438.00	1524.28	2026-03-26	\N
3809	23	SGH9+HP060 2.5B14A	COMFORTMAKER Dual Fuel (96%ecm Motor Furnace) Horiz w/Base Series Heat Pumps	1535.00	1627.10	2026-03-26	\N
3810	23	SGH9+HP060 3B14A	SGH9+HP060 3B14A	1691.00	1792.46	2026-03-26	\N
3811	23	SGH9+HP080 3.5B14A	SGH9+HP080 3.5B14A	1955.00	2072.30	2026-03-26	\N
3812	23	SG9+HP040 2B14	COMFORTMAKER Dual Fuel (96%ecm Motor Furnace) w/Proformance Series Heat Pumps	1586.00	1681.16	2026-03-26	\N
3813	23	SG9+HP060 2B14	COMFORTMAKER Dual Fuel (96%ecm Motor Furnace) w/Proformance Series Heat Pumps	1601.00	1697.06	2026-03-26	\N
3814	23	SG9+HP060 2.5B14	SG9+HP060 2.5B14	1764.00	1869.84	2026-03-26	\N
3815	23	SG9+HP060 3.25B14	SG9+HP060 3.25B14	1911.00	2025.66	2026-03-26	\N
3816	23	SG9+HP080 3.25B14	SG9+HP080 3.25B14	1951.00	2068.06	2026-03-26	\N
3817	23	SG9+HP080 3.5B14	SG9+HP080 3.5B14	2107.00	2233.42	2026-03-26	\N
3818	23	SG9+HP100 3.5B14	SG9+HP100 3.5B14	2111.00	2237.66	2026-03-26	\N
3819	23	SGH9+HP040 2B14	COMFORTMAKER Dual Fuel (96%ecm Motor Furnace) Horiz w/Proformance Series Heat Pumps	1621.00	1718.26	2026-03-26	\N
3820	23	SGH9+HP060 2.5B14	COMFORTMAKER Dual Fuel (96%ecm Motor Furnace) Horiz w/Proformance Series Heat Pumps	1764.00	1869.84	2026-03-26	\N
3821	23	SGH9+HP060 3B14	SGH9+HP060 3B14	1938.00	2054.28	2026-03-26	\N
3822	23	SGH9+HP080 3.5B14	SGH9+HP080 3.5B14	2259.00	2394.54	2026-03-26	\N
3823	23	SHP 7.5 1.5 P15	COMFORTMAKER Performance  Series 15 Heat Pumps	1336.00	1469.60	2026-03-26	\N
3824	23	SHP 10 1.5 P15	COMFORTMAKER Performance  Series 15 Heat Pumps	1343.00	1477.30	2026-03-26	\N
3825	23	SHP 7.5 2 P15	SHP 7.5 2 P15	1402.00	1542.20	2026-03-26	\N
3826	23	SHP 10 2 P15	SHP 10 2 P15	1409.00	1549.90	2026-03-26	\N
3827	23	SHP 7.5 2.5 P15	SHP 7.5 2.5 P15	1553.00	1708.30	2026-03-26	\N
3828	23	SHP 10 2.5 P15	SHP 10 2.5 P15	1560.00	1716.00	2026-03-26	\N
3829	23	SHP 10 2.5 P15	SHP 10 2.5 P15	1560.00	1716.00	2026-03-26	\N
3830	23	SHP 15 2.5 P15	SHP 15 2.5 P15	1585.00	1743.50	2026-03-26	\N
3831	23	SHP 10 3 P15	SHP 10 3 P15	1572.00	1729.20	2026-03-26	\N
3832	23	SHP 15 3 P15	SHP 15 3 P15	1597.00	1756.70	2026-03-26	\N
3833	23	SHP 20 3 P15	SHP 20 3 P15	1614.00	1775.40	2026-03-26	\N
3834	23	SHP 15 3.5 P15	SHP 15 3.5 P15	1756.00	1931.60	2026-03-26	\N
3835	23	SHP 20 3.5 P15	SHP 20 3.5 P15	1773.00	1950.30	2026-03-26	\N
3836	23	SHP 20 4 P15	SHP 20 4 P15	1993.00	2192.30	2026-03-26	\N
3837	23	SHP 20 5 P15	SHP 20 5 P15	2182.00	2400.20	2026-03-26	\N
3838	24	BZDFHP  8CB 1.5S217	Daikin FIT  Variable Speed A/H w/Inverter Drive 16/17 SEER2 Heat Pumps	3012.00	3313.20	2026-03-26	\N
3839	24	BZDFHP  8CB 2S217	Daikin FIT  Variable Speed A/H w/Inverter Drive 16/17 SEER2 Heat Pumps	3075.00	3382.50	2026-03-26	\N
3840	24	BZDFHP  8CB 2.5S217	BZDFHP  8CB 2.5S217	3342.00	3676.20	2026-03-26	\N
3841	24	BZDFHP  8CB 3S217	BZDFHP  8CB 3S217	3495.00	3844.50	2026-03-26	\N
3842	24	BZDFHP  10CB 3.5S217	BZDFHP  10CB 3.5S217	3715.00	4086.50	2026-03-26	\N
3843	24	BZDFHP  15CB 4S217	BZDFHP  15CB 4S217	5025.00	5527.50	2026-03-26	\N
3844	24	DDCHP 1.5S215	Daikin FDMQ-RX Variable Speed Inverter Ducted Concealed Single Zone Heat Pump System 15.3 SEER2	3024.00	3326.40	2026-03-26	\N
3845	25	18SZWMEL	Single Zone Wall Mount  Entry Level	1458.19	1604.01	2026-03-26	\N
3846	25	24SZWMEL	Single Zone Wall Mount  Entry Level	1576.72	1734.39	2026-03-26	\N
3847	25	30SZWMEL	30SZWMEL	2193.12	2412.44	2026-03-26	\N
3848	25	36SZWMEL	36SZWMEL	2923.28	3215.61	2026-03-26	\N
3849	25	9SZWMMS	Single Zone Wall Mount  Entry Level	1168.26	1285.08	2026-03-26	\N
3850	25	12SZWMMS	Single Zone Wall Mount  Entry Level	1286.77	1415.45	2026-03-26	\N
3851	25	18SZWMMS	18SZWMMS	1962.96	2159.26	2026-03-26	\N
3852	25	24SZWMMS	24SZWMMS	2230.69	2453.76	2026-03-26	\N
3853	25	9SZWMHS	Single Zone Wall Mount High Seer (Wi-Fi)	1392.06	1531.27	2026-03-26	\N
3854	25	12SZWMHS	Single Zone Wall Mount High Seer (Wi-Fi)	1473.18	1620.49	2026-03-26	\N
3855	25	15SZWMHS	15SZWMHS	1626.46	1789.11	2026-03-26	\N
3856	25	9SZSD	9SZSD	1441.78	1585.96	2026-03-26	\N
3857	25	12SZSD	12SZSD	1537.10	1690.81	2026-03-26	\N
3858	25	18SZSD	18SZSD	2030.12	2233.13	2026-03-26	\N
3859	25	9SZFMSHC	Single Zone Floor Mount (Standard Heating Capacity)	1459.25	1605.17	2026-03-26	\N
3860	25	12SZFMSHC	Single Zone Floor Mount (Standard Heating Capacity)	1592.06	1751.27	2026-03-26	\N
3861	25	15SZFMSHC	15SZFMSHC	1705.83	1876.41	2026-03-26	\N
3862	26	RAJG96TSVS 40F 1.5S215R32	Goodman ( 96% ) SS/TS/VS 9 Speed Furnace with ecm Motor And Base 16 R-32 Air Conditioner	2359.00	2476.95	2026-03-26	\N
3863	26	RAJG96TSVS 40F 2S215R32	Goodman ( 96% ) SS/TS/VS 9 Speed Furnace with ecm Motor And Base 16 R-32 Air Conditioner	2438.00	2559.90	2026-03-26	\N
3864	26	RAJG96TSVS 40F 2.5S215R32	RAJG96TSVS 40F 2.5S215R32	2545.00	2672.25	2026-03-26	\N
3865	26	RAJG96TSVS 60F 2.5S215R32	RAJG96TSVS 60F 2.5S215R32	2588.00	2717.40	2026-03-26	\N
3866	26	RAJG96TSVS 60F 3S215R32	RAJG96TSVS 60F 3S215R32	2741.00	2878.05	2026-03-26	\N
3867	26	RAJG96TSVS 80F 3.5S215R32	RAJG96TSVS 80F 3.5S215R32	3148.00	3305.40	2026-03-26	\N
3868	26	RAJG96TSVS 80F 4S215R32	RAJG96TSVS 80F 4S215R32	3312.00	3477.60	2026-03-26	\N
3869	26	RAJHPVS 7.5CB 1.5S215R32	Goodman ( Upfl / Horiz ) SmartFrame (TXV) Air Handler with GLZS5BA Series R-32 Heat Pumps	1931.00	2027.55	2026-03-26	\N
3870	26	RAJHPVS 7.5CB 2S215R32	Goodman ( Upfl / Horiz ) SmartFrame (TXV) Air Handler with GLZS5BA Series R-32 Heat Pumps	1971.00	2069.55	2026-03-26	\N
3871	26	RAJHPVS 7.5CB 2.5S215R32	RAJHPVS 7.5CB 2.5S215R32	2144.00	2251.20	2026-03-26	\N
3872	26	RAJHPVS 10CB 2.5S215R32	RAJHPVS 10CB 2.5S215R32	2147.00	2254.35	2026-03-26	\N
3873	26	RAJHPVS 7.5CB 3S215R32	RAJHPVS 7.5CB 3S215R32	2325.00	2441.25	2026-03-26	\N
3874	26	RAJHPVS 15CB 3S215R32	RAJHPVS 15CB 3S215R32	2370.00	2488.50	2026-03-26	\N
3875	26	RAJHPVS 15CB 3.5S215R32	RAJHPVS 15CB 3.5S215R32	2537.00	2663.85	2026-03-26	\N
3876	26	RAJHPVS 20CB 4S215R32	RAJHPVS 20CB 4S215R32	2732.00	2868.60	2026-03-26	\N
3877	26	JG92 40F 1.5S214R32	Goodman ( 92% ) FER 9 Speed Furnace with ecm Motor And Base 14.3 (SEER2) Air Conditioner (R-32)	1774.00	1862.70	2026-03-26	\N
3878	26	JG92 40F 2S214R32	Goodman ( 92% ) FER 9 Speed Furnace with ecm Motor And Base 14.3 (SEER2) Air Conditioner (R-32)	1837.00	1928.85	2026-03-26	\N
3879	26	JG92 40F 2.5S214R32	JG92 40F 2.5S214R32	1929.00	2025.45	2026-03-26	\N
3880	26	JG92 60F 2.5S214R32	JG92 60F 2.5S214R32	1974.00	2072.70	2026-03-26	\N
3881	26	JG92 60F 3S214R32	JG92 60F 3S214R32	2088.00	2192.40	2026-03-26	\N
3882	26	JG92 80F 3S214R32	JG92 80F 3S214R32	2155.00	2262.75	2026-03-26	\N
3883	26	JG92 80F 3.5S214R32	JG92 80F 3.5S214R32	2361.00	2479.05	2026-03-26	\N
3884	26	JG92 100F 3.5S214R32	JG92 100F 3.5S214R32	2434.00	2555.70	2026-03-26	\N
3885	26	JG92 80F 4S214R32	JG92 80F 4S214R32	2510.00	2635.50	2026-03-26	\N
3886	26	JG92 100F 4S214R32	JG92 100F 4S214R32	2583.00	2712.15	2026-03-26	\N
3887	26	JG92 120F 5S214R32	JG92 120F 5S214R32	2829.00	2970.45	2026-03-26	\N
3888	26	JG96TS  40F 2S214R32	Goodman ( 96% ) TS FER 9 Speed Furnace with ecm Motor And Base 14.3 (SEER2) Air Conditioner (R-32)	1965.00	2063.25	2026-03-26	\N
3889	26	JG96TS  40F 2.5S214R32	Goodman ( 96% ) TS FER 9 Speed Furnace with ecm Motor And Base 14.3 (SEER2) Air Conditioner (R-32)	2057.00	2159.85	2026-03-26	\N
3890	26	JG96TS  60F 2.5S214R32	JG96TS  60F 2.5S214R32	2117.00	2222.85	2026-03-26	\N
3891	26	JG96TS  60F 3S214R32	JG96TS  60F 3S214R32	2231.00	2342.55	2026-03-26	\N
3892	26	JG96TS  80F 3S214R32	JG96TS  80F 3S214R32	2373.00	2491.65	2026-03-26	\N
3893	26	JG96TS  80F 3.5S214R32	JG96TS  80F 3.5S214R32	2559.00	2686.95	2026-03-26	\N
3894	26	JG96TS100F 3.5S214R32	JG96TS100F 3.5S214R32	2589.00	2718.45	2026-03-26	\N
3895	26	JG96TS  80F 4S214R32	JG96TS  80F 4S214R32	2708.00	2843.40	2026-03-26	\N
3896	26	JG96TS100F 4S214R32	JG96TS100F 4S214R32	2738.00	2874.90	2026-03-26	\N
3897	26	JG96TS100F 4.25S214R32	JG96TS100F 4.25S214R32	2774.00	2912.70	2026-03-26	\N
3898	26	JG96TS120F 5S214R32	JG96TS120F 5S214R32	2968.00	3116.40	2026-03-26	\N
3899	26	JGH96TS 30F 1.5S214R-32	Goodman ( 96% ) TS FER 9 Speed Furnace with ecm Motor And Base 14.3 (SEER2) Air Conditioner (R-32)	1901.00	1996.05	2026-03-26	\N
3900	26	JGH96TS 30F 2S214R-32	Goodman ( 96% ) TS FER 9 Speed Furnace with ecm Motor And Base 14.3 (SEER2) Air Conditioner (R-32)	1975.00	2073.75	2026-03-26	\N
3901	26	JGH96TS  40F 2S214R32	JGH96TS  40F 2S214R32	2005.00	2105.25	2026-03-26	\N
3902	26	JGH96TS  40F 2.5S214R32	JGH96TS  40F 2.5S214R32	2058.00	2160.90	2026-03-26	\N
3903	26	JGH96TS  60F 2.5S214R32	JGH96TS  60F 2.5S214R32	2118.00	2223.90	2026-03-26	\N
3904	26	JGH96TS  60F 3S214R32	JGH96TS  60F 3S214R32	2233.00	2344.65	2026-03-26	\N
3905	26	KJGH96TS  80F 3.5S214R32	KJGH96TS  80F 3.5S214R32	2557.00	2684.85	2026-03-26	\N
3906	26	JGH96TS  80F 3.5S214R32	JGH96TS  80F 3.5S214R32	2589.00	2718.45	2026-03-26	\N
3907	26	JGH96TS100F 4S214R32	JGH96TS100F 4S214R32	2721.00	2857.05	2026-03-26	\N
3908	26	JG96TS 40F 2S215R32	Goodman ( 96% ) TS FER 9 Speed Furnace with ecm Motor And Base 15 (SEER2) Air Conditioner	2126.00	2232.30	2026-03-26	\N
3909	26	JG96TS 40F 2.5S215R32	Goodman ( 96% ) TS FER 9 Speed Furnace with ecm Motor And Base 15 (SEER2) Air Conditioner	2228.00	2339.40	2026-03-26	\N
3910	26	JG96TS  60F 2S215R32	JG96TS  60F 2S215R32	2189.00	2298.45	2026-03-26	\N
3911	26	JG96TS  60F 2.5S215R32	JG96TS  60F 2.5S215R32	2288.00	2402.40	2026-03-26	\N
3912	26	JG96TS  60F 3S215R32	JG96TS  60F 3S215R32	2421.00	2542.05	2026-03-26	\N
3913	26	JG96TS  80F 3S215R32	JG96TS  80F 3S215R32	2563.00	2691.15	2026-03-26	\N
3914	26	JG96TS100F 3.5S215R32	JG96TS100F 3.5S215R32	2805.00	2945.25	2026-03-26	\N
3915	26	JG96TS100F 4S215R32	JG96TS100F 4S215R32	2969.00	3117.45	2026-03-26	\N
3916	26	JG96TS100F 5S215R32	JG96TS100F 5S215R32	3209.00	3369.45	2026-03-26	\N
3917	26	JHP 5CB 1.5S214R32	Goodman ( Upfl / Horiz ) Air Handler with 14.3 SEER2 Series R-32 Heat Pumps	1673.00	1756.65	2026-03-26	\N
3918	26	JHP 7.5CB 1.5S214R32	Goodman ( Upfl / Horiz ) Air Handler with 14.3 SEER2 Series R-32 Heat Pumps	1690.00	1774.50	2026-03-26	\N
3919	26	JHP 7.5CB 2S214R32	JHP 7.5CB 2S214R32	1723.00	1809.15	2026-03-26	\N
3920	26	JHP 10CB 2S214R32	JHP 10CB 2S214R32	1726.00	1812.30	2026-03-26	\N
3921	26	JHP 10CB 2.5S214R32	JHP 10CB 2.5S214R32	1908.00	2003.40	2026-03-26	\N
3922	26	JHP 15CB 2.5S214R32	JHP 15CB 2.5S214R32	1950.00	2047.50	2026-03-26	\N
3923	26	JHP 10CB 3S214R32	JHP 10CB 3S214R32	2139.00	2245.95	2026-03-26	\N
3924	26	JHP 15CB 3S214R32	JHP 15CB 3S214R32	2181.00	2290.05	2026-03-26	\N
3925	26	JHP 15CB 3.5S214R32	JHP 15CB 3.5S214R32	2314.00	2429.70	2026-03-26	\N
3926	26	JHP 20CB 4S214R32	JHP 20CB 4S214R32	2487.00	2611.35	2026-03-26	\N
3927	26	JHP 20CB 5S214R32	JHP 20CB 5S214R32	2858.00	3000.90	2026-03-26	\N
3928	26	JHPVS5CB1.5S217SDR32	Goodman ( Upfl / Horiz ) VS Air Handler with 17.2 SEER2 Series Heat Pumps	2919.00	3064.95	2026-03-26	\N
3929	26	JHPVS5CB2S217SDR32	Goodman ( Upfl / Horiz ) VS Air Handler with 17.2 SEER2 Series Heat Pumps	2976.00	3124.80	2026-03-26	\N
3930	26	JHPVS8CB2S217SDR32	JHPVS8CB2S217SDR32	2993.00	3142.65	2026-03-26	\N
3931	26	JHPVS10CB2S217SDR32	JHPVS10CB2S217SDR32	2996.00	3145.80	2026-03-26	\N
3932	26	JHPVS8CB2.5S217SDR32	JHPVS8CB2.5S217SDR32	3253.00	3415.65	2026-03-26	\N
3933	26	JHPVS10CB2.5S217SDR32	JHPVS10CB2.5S217SDR32	3256.00	3418.80	2026-03-26	\N
3934	26	JHPVS8CB3S217SDR32	JHPVS8CB3S217SDR32	3394.00	3563.70	2026-03-26	\N
3935	26	JHPVS10CB3S217SDR32	JHPVS10CB3S217SDR32	3397.00	3566.85	2026-03-26	\N
3936	26	JHPVS15CB3.5S217SDR32	JHPVS15CB3.5S217SDR32	3646.00	3828.30	2026-03-26	\N
3937	26	JHPVS15CB4S217SDR32	JHPVS15CB4S217SDR32	3823.00	4014.15	2026-03-26	\N
3938	26	JHPVS15CB5S217SDR32	JHPVS15CB5S217SDR32	4203.00	4413.15	2026-03-26	\N
3939	27	LG93   45F XE 1.5S2 15ML17	LENNOX ( 93% ) upflow FER FURNACE W/upflow COIL and SEER2 AIR COND.	1892.00	2035.52	2026-03-26	\N
3940	27	LG93   45F XE 2S2 15ML17	LG93   45F XE 1.5S2 15ML17	1946.00	2092.76	2026-03-26	\N
3941	27	LG93   45F XE 2.5S2 15ML17	LG93   45F XE 1.5S2 15ML17	1989.00	2138.34	2026-03-26	\N
3942	27	LG93   70F XE 2.5S2 15ML17	LG93   45F XE 2.5S2 15ML17	2024.00	2175.44	2026-03-26	\N
3943	27	LG93   70F XE 3S2 15ML17	LG93   70F XE 2.5S2 15ML17	2079.00	2233.74	2026-03-26	\N
3944	27	LG93   90F XE 3.5S2 15ML17	LG93   70F XE 2.5S2 15ML17	2322.00	2491.32	2026-03-26	\N
3945	27	LG93   90F XE 4S2 15ML17	LG93   90F XE 3.5S2 15ML17	2481.00	2659.86	2026-03-26	\N
3946	27	LG93 110F XE 5S2 15ML17	LG93   90F XE 3.5S2 15ML17	2764.00	2959.84	2026-03-26	\N
3947	27	LG93   45F XE 1.5S215ML14R454	LENNOX ( 93% ) upflow FER FURNACE W/upflow COIL and SEER2 AIR COND.	1927.00	2072.62	2026-03-26	\N
3948	27	LG93   45F XE 2S215ML14R454	LG93   45F XE 1.5S215ML14R454	1981.00	2129.86	2026-03-26	\N
3949	27	LG93   45F XE 2.5S215ML14R454	LG93   45F XE 2S215ML14R454	2026.00	2177.56	2026-03-26	\N
3950	27	LG93   70F XE 2.5S215ML14R454	LG93   45F XE 2.5S215ML14R454	2061.00	2214.66	2026-03-26	\N
3951	27	LG93   70F XE 3S215ML14R454	LG93   70F XE 2.5S215ML14R454	2120.00	2277.20	2026-03-26	\N
3952	27	LG93   90F XE 3.5S215ML14R454	LG93   70F XE 3S215ML14R454	2365.00	2536.90	2026-03-26	\N
3953	27	LG93   90F XE 4S215ML14R454	LG93   90F XE 3.5S215ML14R454	2530.00	2711.80	2026-03-26	\N
3954	27	LG93 110F XE 5S215ML14R454	LG93   90F XE 4S215ML14R454	2819.00	3018.14	2026-03-26	\N
3955	27	LG93   45F XE 2S2 15ML18	LENNOX ( 93% ) upflow FER FURNACE W/upflow COIL and 15 SEER2 AIR COND.	2101.00	2257.06	2026-03-26	\N
3956	27	LG93   70F XE 3S2 15ML18	LENNOX ( 93% ) upflow FER FURNACE W/upflow COIL and 15 SEER2 AIR COND.	2304.00	2472.24	2026-03-26	\N
3957	27	LG93   90F XE 4S2 15ML18	LG93   90F XE 4S2 15ML18	2767.00	2963.02	2026-03-26	\N
3958	27	LG93 110F XE 5S2 15ML18	LG93 110F XE 5S2 15ML18	3109.00	3325.54	2026-03-26	\N
3959	27	LG H93  45F XE 2S2 15ML18	LENNOX ( 93% ) HORIZ  FER FURNACE W/HORIZ COIL W/15 SEER2 AIR COND.	2137.00	2295.22	2026-03-26	\N
3960	27	LG H93  70F XE 3S2 15ML18	LENNOX ( 93% ) HORIZ  FER FURNACE W/HORIZ COIL W/15 SEER2 AIR COND.	2393.00	2566.58	2026-03-26	\N
3961	27	LG 96  45 XV 2S2 15ML18	LENNOX ( 96% ) UPFLOW FER FURNACE W/UPFLOW COIL AND /15 SEER2 AIR COND.	3000.00	3210.00	2026-03-26	\N
3962	27	LG 96  70 XV 2S2 15ML18	LENNOX ( 96% ) UPFLOW FER FURNACE W/UPFLOW COIL AND /15 SEER2 AIR COND.	3052.00	3265.12	2026-03-26	\N
3963	27	LG 96  70 XV 3S2 15ML18	LG 96  70 XV 3S2 15ML18	3220.00	3443.20	2026-03-26	\N
3964	27	LG H96  45 XV 2S2 15ML18	LENNOX ( 96% ) HORIZ FER FURNACE W/HORIZ COIL W/15 SEER2 AIR COND.	3036.00	3248.16	2026-03-26	\N
3965	27	LG H96  70 XV 2S2 15ML18	LENNOX ( 96% ) HORIZ FER FURNACE W/HORIZ COIL W/15 SEER2 AIR COND.	3088.00	3303.28	2026-03-26	\N
3966	27	LG H96  70 XV 3S2 15ML18	LG H96  70 XV 3S2 15ML18	3309.00	3537.54	2026-03-26	\N
3967	27	LG96 70FXE2S215ML17	LENNOX ( 96% ) upflow FER FURNACE W/upflow COIL and SEER2 AIR COND.	2062.00	2215.72	2026-03-26	\N
3968	27	LG96 70FXE2.5S215ML17	LG96 70FXE2.5S215ML17	2130.00	2287.80	2026-03-26	\N
3969	27	LHP 5 1.5 S214	LENNOX  Merit Series Heat Pumps 17XP	1624.00	1751.44	2026-03-26	\N
3970	27	LHP 5 2 S214	LENNOX  Merit Series Heat Pumps 17XP	1741.00	1875.46	2026-03-26	\N
3971	27	LHP 7.5 2 S214	LHP 7.5 2 S214	1758.00	1893.48	2026-03-26	\N
3972	27	LHP 10 2 S214	LHP 10 2 S214	1763.00	1898.78	2026-03-26	\N
3973	27	LHP 10 2.5 S214	LHP 10 2.5 S214	1884.00	2027.04	2026-03-26	\N
3974	27	LHP 10 3.0 S214	LHP 10 3.0 S214	2015.00	2165.90	2026-03-26	\N
3975	27	LHP 15 3.0 S214	LHP 15 3.0 S214	2052.00	2205.12	2026-03-26	\N
3976	27	LHP 15 3.5 S214	LHP 15 3.5 S214	2274.00	2440.44	2026-03-26	\N
3977	27	LHP 15 4S214	LHP 15 4S214	2436.00	2612.16	2026-03-26	\N
3978	27	LHP 20 4S214	LHP 20 4S214	2459.00	2636.54	2026-03-26	\N
3979	27	LHP 20 5S214	LHP 20 5S214	2732.00	2925.92	2026-03-26	\N
3980	27	LHP 5 1.5 S214R454	LENNOX  Merit Series Heat Pumps 14KP	1934.00	2080.04	2026-03-26	\N
3981	27	LHP 5 2 S214R454	LENNOX  Merit Series Heat Pumps 14KP	2055.00	2208.30	2026-03-26	\N
3982	27	LHP 7.5 2 S214R454	LHP 7.5 2 S214R454	2072.00	2226.32	2026-03-26	\N
3983	27	LHP 10 2 S214R454	LHP 10 2 S214R454	2077.00	2231.62	2026-03-26	\N
3984	27	LHP 10 2.5 S214R454	LHP 10 2.5 S214R454	2210.00	2372.60	2026-03-26	\N
3985	27	LHP 10 3.0 S214R454	LHP 10 3.0 S214R454	2341.00	2511.46	2026-03-26	\N
3986	27	LHP 15 3.0 S214R454	LHP 15 3.0 S214R454	2378.00	2550.68	2026-03-26	\N
3987	27	LHP 15 3.5 S214R454	LHP 15 3.5 S214R454	2611.00	2797.66	2026-03-26	\N
3988	27	LHP 15 4S214	LHP 15 4S214	2777.00	2973.62	2026-03-26	\N
3989	27	LHP 20 4S214	LHP 20 4S214	2800.00	2998.00	2026-03-26	\N
3990	27	LHP 20 5S214	LHP 20 5S214	3085.00	3300.10	2026-03-26	\N
3991	27	LG93HP  90F XE 3.5S2 15ML17XP	LENNOX ( 93% ) upflow FER FURNACE W/upflow COIL and SEER2 Heat Pump (Dual Fuel)	2620.00	2807.20	2026-03-26	\N
3992	28	MM .75P	( Misc. Mitsubish ) Mini Split  Single Wall Mounted  Indoor Blower  System ( 16 to 21 Seer )	1595.00	2073.50	2026-03-26	\N
3993	28	MM 1.00P	( Misc. Mitsubish ) Mini Split  Single Wall Mounted  Indoor Blower  System ( 16 to 21 Seer )	1782.00	2316.60	2026-03-26	\N
3994	28	MM 1.25P	MM 1.25P	2098.00	2727.40	2026-03-26	\N
3995	28	MM 1.5P	MM 1.5P	2547.00	3311.10	2026-03-26	\N
3996	28	MMFZ 1.5 H2I	( Misc. Mitsubish ) Mini Split  Single Floor Mounted  Indoor Blower System ( 20 Seer and Up ) (Hyper Heat)	3514.00	4568.20	2026-03-26	\N
3997	28	MMSLZKF .75SGWR	( Misc. Mitsubish ) Mini Split  Single Ceiling Mounted  Indoor Blower System ( 20 Seer and Up ) (Hyper Heat)	1991.00	2588.30	2026-03-26	\N
3998	28	MD 12	( Misc.DAIKEN ) ( Mini Split )  Air Handler / Remote Outdoor Unit	1548.50	2013.05	2026-03-26	\N
3999	28	LLOYDES 9 230V	( Misc. LLoyds ) Mini Split  Single Wall Mounted  Indoor Blower  System ( 16 to 21 Seer )	470.00	611.00	2026-03-26	\N
4000	28	LLOYDES 12 230V	( Misc. LLoyds ) Mini Split  Single Wall Mounted  Indoor Blower  System ( 16 to 21 Seer )	500.00	650.00	2026-03-26	\N
4001	28	LLOYDES 18 230V	LLOYDES 18 230V	700.00	910.00	2026-03-26	\N
4002	28	LLOYDES 24 230V	LLOYDES 24 230V	840.00	1092.00	2026-03-26	\N
4003	28	KFCMGT 15 6 PACK	Kettler Forline Lot 95 Brookfield Climate Master ( Tranquility ) Geothermal	11293.80	12423.18	2026-03-26	\N
4004	28	EHCMGT 8 2.5 SPLIT	Evergreene Homes Climate Master Geothermal	8962.20	9858.42	2026-03-26	\N
4005	28	EHCMGT 15 3 PACK	Evergreene Homes Climate Master Geothermal	9906.00	10896.60	2026-03-26	\N
4006	28	EHCMGT 8 2.6 SPLIT	EHCMGT 8 2.6 SPLIT	9160.50	10076.55	2026-03-26	\N
4007	28	CHCMGT 10 5 PACK	Caruso Homes Climate Master Geothermal	11572.50	12729.75	2026-03-26	\N
4008	28	SLCMGT 15 4 PACK	September La Climate Master Geothermal	11112.93	12224.22	2026-03-26	\N
4009	28	SLCMGT 10 3 SPLIT	SLCMGT 10 3 SPLIT	10368.87	11405.76	2026-03-26	\N
4010	28	SLCMGT  8 2 SPLIT	SLCMGT  8 2 SPLIT	10134.61	11148.08	2026-03-26	\N
4011	28	BRCMGT 15 4 PACK	Babcock Rd Climate Master Geothermal	11111.43	12222.57	2026-03-26	\N
4012	28	BRCMGT 10 2 PACK	BRCMGT 10 2 PACK	8926.86	9819.55	2026-03-26	\N
4013	28	MRCMGT 10 2PACK	Millwood Rd Climate Master Geothermal	9228.17	10150.98	2026-03-26	\N
4014	28	MRCMGT 10 4PACK	MRCMGT 10 4PACK	10924.05	12016.46	2026-03-26	\N
4015	28	MRCMGT  8 2SPLIT	MRCMGT  8 2SPLIT	9060.80	9966.87	2026-03-26	\N
4016	28	MRCMGT  8 2SPLIT	MRCMGT  8 2SPLIT	9047.75	9952.52	2026-03-26	\N
4017	28	MRCMGT  8 2SPLIT	MRCMGT  8 2SPLIT	9060.80	9966.87	2026-03-26	\N
4018	28	WDCMGT 8 2 PACK	William Douglas Homes - Climate Master Geothermal	9130.82	10043.90	2026-03-26	\N
4019	28	WDCMGT 10 4 SPLIT	WDCMGT 10 4 SPLIT	11455.02	12600.52	2026-03-26	\N
4020	28	WDCMGT  8 2 SPLIT	WDCMGT  8 2 SPLIT	9677.67	10645.44	2026-03-26	\N
4021	28	TG96 40F 1.5S214	Carrier Comfort Series ( 92%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner	3044.00	3348.40	2026-03-26	\N
4022	28	TG96 60F 3S214	Carrier Comfort Series ( 92%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner	3348.00	3682.80	2026-03-26	\N
4023	28	THP 7.5CB 2S214	Carrier Comfort Series ( 92%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner	2007.00	2207.70	2026-03-26	\N
4024	28	THPVSAH 5CB 2S218	Carrier Comfort Series ( 92%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner	4855.00	5340.50	2026-03-26	\N
4025	28	THPVSAH 10CB 3S218	Carrier Comfort Series ( 92%) Fer Furnace with Base Series 14.3 SEER2 Air Conditioner	5511.00	6062.10	2026-03-26	\N
4026	29	RG92 40F 1.5S214R454	RHEEM ( 92% ) FER FURNACE W/CLASSIC RA14AZ 14.3 SEER AIR CONDITIONER (R-454B)	2198.00	2307.90	2026-03-26	\N
4027	29	RG92 40F 2S214R454	RHEEM ( 92% ) FER FURNACE W/CLASSIC RA14AZ 14.3 SEER AIR CONDITIONER (R-454B)	2118.00	2223.90	2026-03-26	\N
4028	29	RG92 40F 2.5S214R454	RG92 40F 2.5S214R454	2268.00	2381.40	2026-03-26	\N
4029	29	RG92 60F 2S214R454	RG92 60F 2S214R454	2165.00	2273.25	2026-03-26	\N
4030	29	RG92 60F 2.5S214R454	RG92 60F 2.5S214R454	2315.00	2430.75	2026-03-26	\N
4031	29	RG92 60F 3S214R454	RG92 60F 3S214R454	2647.00	2779.35	2026-03-26	\N
4032	29	RG92 100F 3S214R454	RG92 100F 3S214R454	2771.00	2909.55	2026-03-26	\N
4033	29	RG92 100F 3.5S214R454	RG92 100F 3.5S214R454	3024.00	3175.20	2026-03-26	\N
4034	29	RG92 100F 4S214R454	RG92 100F 4S214R454	3125.00	3281.25	2026-03-26	\N
4035	29	RG92 100F 5S214R454	RG92 100F 5S214R454	3342.00	3509.10	2026-03-26	\N
4036	29	RG92 115F 5S214R454	RG92 115F 5S214R454	3414.00	3584.70	2026-03-26	\N
4037	29	RHP   5 1.5S214R454	Rheem High Eff  ( Upfl, Horiz, Dnfl ) Air Hnadler with Classic Series RP14AZ Heat Pump (R-454)	1889.00	1983.45	2026-03-26	\N
4038	29	RHP7. 5 1.5S214R454	Rheem High Eff  ( Upfl, Horiz, Dnfl ) Air Hnadler with Classic Series RP14AZ Heat Pump (R-454)	1916.00	2011.80	2026-03-26	\N
4039	29	RHP7.5 2S214R454	RHP7.5 2S214R454	1977.00	2075.85	2026-03-26	\N
4040	29	RHP 10 2S214R454	RHP 10 2S214R454	1977.00	2075.85	2026-03-26	\N
4041	29	RHP7.5 2.5S214R454	RHP7.5 2.5S214R454	2116.00	2221.80	2026-03-26	\N
4042	29	RHP 10 2.5S214R454	RHP 10 2.5S214R454	2116.00	2221.80	2026-03-26	\N
4043	29	RHP 15 2.5S214R454	RHP 15 2.5S214R454	2179.00	2287.95	2026-03-26	\N
4044	29	RHP 10 3S214R454	RHP 10 3S214R454	2250.00	2362.50	2026-03-26	\N
4045	29	RHP 15 3S214R454	RHP 15 3S214R454	2313.00	2428.65	2026-03-26	\N
4046	29	RHP 15 3.5S214R454	RHP 15 3.5S214R454	2615.00	2745.75	2026-03-26	\N
4047	29	RHP 20 3.5S214R454	RHP 20 3.5S214R454	2652.00	2784.60	2026-03-26	\N
4048	29	RHP 15 4S214R454	RHP 15 4S214R454	2825.00	2966.25	2026-03-26	\N
4049	29	RHP 20 4S214R454	RHP 20 4S214R454	2862.00	3005.10	2026-03-26	\N
4050	29	RHP 20 5S214R454	RHP 20 5S214R454	3478.00	3651.90	2026-03-26	\N
4051	29	RHP5 1.5S215R454	Rheem High Eff  ( Upfl, Horiz, Dnfl ) Air Handler with Classic Series RP15AZ Heat Pump (R-454)	2413.00	2533.65	2026-03-26	\N
4052	29	RHP7. 51.5S215R454	Rheem High Eff  ( Upfl, Horiz, Dnfl ) Air Handler with Classic Series RP15AZ Heat Pump (R-454)	2440.00	2562.00	2026-03-26	\N
4053	29	RHP7.52S215R454	RHP7.52S215R454	2235.00	2346.75	2026-03-26	\N
4054	29	RHP102S215R454	RHP102S215R454	2235.00	2346.75	2026-03-26	\N
4055	29	RHP7.52.5S215R454	RHP7.52.5S215R454	2506.00	2631.30	2026-03-26	\N
4056	29	RHP102.5S215R454	RHP102.5S215R454	2506.00	2631.30	2026-03-26	\N
4057	29	RHP152.5S215R454	RHP152.5S215R454	2569.00	2697.45	2026-03-26	\N
4058	29	RHP103S215R454	RHP103S215R454	2692.00	2826.60	2026-03-26	\N
4059	29	RHP153S215R454	RHP153S215R454	2755.00	2892.75	2026-03-26	\N
4060	29	RHP153.5S215R454	RHP153.5S215R454	3173.00	3331.65	2026-03-26	\N
4061	29	RHP203.5S215R454	RHP203.5S215R454	3210.00	3370.50	2026-03-26	\N
4062	29	RHP154S215R454	RHP154S215R454	3176.00	3334.80	2026-03-26	\N
4063	29	RHP204S215R454	RHP204S215R454	3213.00	3373.65	2026-03-26	\N
4064	29	RHP205S215R454	RHP205S215R454	3761.00	3949.05	2026-03-26	\N
4065	29	RG96HP40F2.5S215R454	RHEEM ( 96% ) FURNACE W/Classic Series 15.0 SEER2 HEAT PUMP (Dual Fuel)	3466.00	3639.30	2026-03-26	\N
4066	29	RGH96HP40F2.5S215R454	RHEEM ( 96% ) FURNACE W/Classic Series 15.0 SEER2 HEAT PUMP (Horiz. Dual Fuel)	3466.00	3639.30	2026-03-26	\N
4067	29	RG9640F2S215R454	RHEEM ( 96% ) FURNACE W/Classic Series 15.0 SEER2 Air Conditioner	2992.00	3141.60	2026-03-26	\N
4068	30	T96V 60 2.0TTR	TRANE UPFLOW  TSVS GAS FURN W/ 17SEER AIR COND	2774.58	2941.05	2026-03-26	\N
4069	30	T96V 60 3.0TTR	TRANE UPFLOW  TSVS GAS FURN W/ 17SEER AIR COND	2982.58	3161.53	2026-03-26	\N
4070	30	THP 10 2.5TWR5	THP 10 2.5TWR5	2592.77	2748.34	2026-03-26	\N
4071	30	THP  8 2.0TWR7	THP  8 2.0TWR7	2340.61	2481.05	2026-03-26	\N
4072	30	THP 10 2.5TWR	THP 10 2.5TWR	945.92	1565.40	2026-03-26	\N
\.


--
-- Data for Name: event_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_log (id, event_at, username, plan_id, event_type, description) FROM stdin;
163	2026-03-26 11:12:25.629279	admin	3428	plan_created	Plan AD0010326 created
164	2026-03-26 11:12:36.96594	system	3428	house_type_added	House type 'ABC' added to AD0010326
165	2026-03-26 11:19:10.221741	system	3428	plan_contracted	Plan AD0010326 contracted
\.


--
-- Data for Name: house_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.house_types (id, plan_id, house_number, name, bid_hours, pwk_sheet_metal, total_bid, notes) FROM stdin;
3458	3428	01	ABC	\N	\N	\N	\N
3429	3408	01	The Hampton	37.31	\N	3328.90	\N
3430	3408	02	The Jefferson	22.74	\N	5851.34	\N
3431	3409	01	Model 2200	28.36	\N	12147.05	\N
3432	3410	01	The Canterbury	20.83	\N	4143.21	\N
3450	3422	01	Model 3600	32.18	\N	10477.89	\N
3451	3423	01	The Princeton	16.85	\N	5642.98	\N
3452	3424	01	The Tidewater	29.46	\N	5973.63	\N
3453	3424	02	Model 3600	38.88	\N	7420.44	\N
3454	3425	01	The Newport	33.89	\N	3920.06	\N
3455	3425	02	Elevation A	27.13	\N	4342.66	\N
3456	3426	01	Model 3200	22.86	\N	9723.93	\N
3457	3427	01	Elevation A	17.27	\N	7327.17	\N
3433	3411	01	Model 3200	20.57	\N	7256.27	\N
3434	3411	02	Elevation A	13.09	\N	9514.08	\N
3435	3412	01	The Berkshire	39.11	\N	5801.14	\N
3436	3412	02	The Tidewater	16.76	\N	10124.97	\N
3437	3413	01	Elevation D	36.93	\N	4210.18	\N
3438	3413	02	The Queensbury	21.29	\N	3308.59	\N
3439	3414	01	The Newport	33.75	\N	10366.00	\N
3440	3414	02	Model 2800	37.32	\N	10430.78	\N
3441	3415	01	The Ashford	32.14	\N	7973.82	\N
3442	3416	01	The Jefferson	21.34	\N	5771.51	\N
3443	3417	01	The Hampton	26.13	\N	3477.84	\N
3444	3418	01	The Ashford	38.32	\N	4905.14	\N
3445	3418	02	The Saratoga	35.65	\N	3713.83	\N
3446	3419	01	Model 3600	21.53	\N	6992.99	\N
3447	3420	01	Model 3200	39.36	\N	5820.12	\N
3448	3420	02	Model 2200	26.27	\N	10264.94	\N
3449	3421	01	Model 2800	21.10	\N	3424.61	\N
3369	3368	01	The Jefferson	25.75	\N	2855.83	\N
3370	3368	02	Model 3200	30.74	\N	3237.30	\N
3371	3369	01	The Kingston	12.66	\N	8693.75	\N
3372	3370	01	The Essex	20.72	\N	8775.42	\N
3373	3370	02	Elevation B	13.09	\N	4169.99	\N
3374	3371	01	The Newport	15.57	\N	2775.83	\N
3375	3372	01	Model 2400	13.92	\N	8900.80	\N
3376	3372	02	The Montrose	29.73	\N	11794.13	\N
3377	3373	01	The Inverness	39.86	\N	6014.39	\N
3378	3374	01	Model 2400	29.43	\N	5743.39	\N
3379	3374	02	The Essex	20.66	\N	6921.19	\N
3380	3375	01	Elevation B	24.16	\N	3552.88	\N
3381	3375	02	Model 2800	18.14	\N	9872.28	\N
3382	3376	01	The Jefferson	38.05	\N	7517.97	\N
3383	3376	02	The Essex	33.82	\N	4683.28	\N
3384	3377	01	Model 2400	33.73	\N	3403.56	\N
3385	3378	01	The Saratoga	31.36	\N	4258.62	\N
3386	3378	02	The Queensbury	37.10	\N	8458.30	\N
3387	3379	01	Model 2200	24.36	\N	7546.89	\N
3388	3379	02	Elevation A	27.06	\N	6096.82	\N
3389	3380	01	Elevation D	34.63	\N	10709.32	\N
3390	3380	02	The Berkshire	12.33	\N	9060.66	\N
3391	3381	01	The Berkshire	13.39	\N	6866.94	\N
3392	3382	01	The Dorchester	12.63	\N	6711.55	\N
3393	3383	01	The Newport	14.23	\N	8621.48	\N
3394	3383	02	The Newport	17.93	\N	11646.72	\N
3395	3384	01	Elevation A	34.42	\N	3622.46	\N
3396	3385	01	Model 3200	25.75	\N	8995.35	\N
3397	3385	02	Model 3600	25.67	\N	2743.65	\N
3398	3386	01	Model 3200	23.80	\N	3449.76	\N
3399	3386	02	The Lexington	18.34	\N	6108.10	\N
3400	3387	01	The Saratoga	37.72	\N	6170.32	\N
3401	3387	02	Elevation C	31.40	\N	9404.52	\N
3402	3388	01	The Lexington	12.44	\N	6473.85	\N
3403	3388	02	The Grandview	13.69	\N	7858.91	\N
3404	3389	01	The Richmond	14.70	\N	10914.54	\N
3405	3390	01	The Essex	22.21	\N	3372.46	\N
3406	3391	01	The Essex	23.32	\N	8641.86	\N
3407	3392	01	Elevation C	31.42	\N	8974.50	\N
3408	3393	01	The Hampton	12.65	\N	9512.06	\N
3409	3393	02	Elevation C	20.36	\N	10291.56	\N
3410	3394	01	The Dorchester	27.48	\N	8937.19	\N
3411	3395	01	The Queensbury	27.09	\N	8991.54	\N
3412	3396	01	The Fairfax	18.41	\N	6810.02	\N
3413	3396	02	The Montrose	17.36	\N	8294.47	\N
3414	3397	01	The Princeton	34.45	\N	9065.25	\N
3415	3397	02	The Fairfax	28.62	\N	7538.26	\N
3416	3398	01	The Montrose	26.52	\N	7634.16	\N
3417	3399	01	The Queensbury	22.45	\N	5525.51	\N
3418	3399	02	The Kingston	31.94	\N	2526.91	\N
3419	3400	01	The Ashford	26.26	\N	10390.82	\N
3420	3401	01	Elevation B	27.49	\N	10069.43	\N
3421	3402	01	Elevation C	34.09	\N	4910.50	\N
3422	3403	01	Model 3200	34.31	\N	8207.96	\N
3423	3403	02	The Oxford	15.18	\N	4251.93	\N
3424	3404	01	The Lexington	19.52	\N	5109.87	\N
3425	3405	01	The Berkshire	13.10	\N	9179.56	\N
3426	3406	01	The Fairfax	24.26	\N	8255.83	\N
3427	3407	01	Model 3600	30.29	\N	5555.12	\N
3428	3407	02	Model 3200	31.45	\N	3550.09	\N
\.


--
-- Data for Name: kit_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kit_items (id, category, description, base_price, price_per_ton, unit, sort_order, active) FROM stdin;
1	sheet_metal	Sheet metal fabrication — supply plenum	150.00	25.00	each	10	t
2	sheet_metal	Sheet metal fabrication — return plenum	120.00	20.00	each	20	t
3	sheet_metal	Sheet metal fabrication — transitions/offsets	75.00	10.00	each	30	t
4	flex_line	Flex duct (per zone)	80.00	12.00	zone	40	t
5	flex_line	Flex duct connectors / clamps	25.00	0.00	each	50	t
6	refrigerant	Refrigerant line set — copper	110.00	18.00	each	60	t
7	refrigerant	Refrigerant line set insulation (Rubatex)	40.00	6.00	each	70	t
8	refrigerant	Service valve locking caps	15.00	0.00	set	80	t
9	drain	Condensate drain line — PVC	45.00	0.00	each	90	t
10	drain	Float switch	35.00	0.00	each	100	t
11	drain	Condensate pump (if required)	85.00	0.00	each	110	t
12	mastic	Mastic duct sealing package	50.00	8.00	each	120	t
13	mastic	Mastic — fittings and boots	30.00	0.00	each	130	t
\.


--
-- Data for Name: line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.line_items (id, system_id, sort_order, pricing_flag, description, quantity, unit_price, pwk_price, draw_stage, part_number, notes) FROM stdin;
3079	287	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	\N	\N	\N
3080	287	02	standard	Canvas connector supply/return	1.00	45.00	\N	\N	\N	\N
3081	287	03	standard	Fire stopping — band board penetrations	1.00	0.00	\N	\N	\N	\N
3082	287	04	standard	Refrigerant lines through band board	1.00	0.00	\N	\N	\N	\N
3083	287	05	standard	Bath fans run to exterior (50 CFM)	1.00	0.00	\N	\N	\N	\N
3084	287	06	standard	Float switch	1.00	35.00	\N	\N	\N	\N
3085	287	07	standard	Service valve locking caps	1.00	15.00	\N	\N	\N	\N
3086	287	08	standard	Condensate drain line — PVC	1.00	0.00	\N	\N	\N	\N
3087	287	09	standard	Mastic duct sealing package	1.00	70.00	\N	\N	\N	\N
3088	287	10	standard	Sheet metal — supply plenum	1.00	0.00	\N	\N	\N	\N
3089	287	11	standard	Sheet metal — return plenum	1.00	0.00	\N	\N	\N	\N
3090	287	12	standard	Flex duct	1.00	0.00	\N	\N	\N	\N
3091	287	13	standard	Flex duct connectors / clamps	1.00	0.00	\N	\N	\N	\N
3092	287	20	standard	12SZFMSHC — AGU12RLF	1.00	1592.06	\N		12SZFMSHC	\N
3093	287	30	standard	Sheet metal — transitions / offsets	8.00	115.00	\N	\N	\N	\N
3094	287	60	standard	Refrigerant line set — copper	60.00	13.30	\N	\N	\N	\N
3095	287	70	standard	Refrigerant line insulation (Rubatex R3)	60.00	2.80	\N	\N	\N	\N
3096	287	110	standard	Condensate pump	1.00	85.00	\N	\N	\N	\N
3097	287	130	standard	Mastic — fittings and boots	1.00	30.00	\N	\N	\N	\N
3098	287	140	standard	Canvas connector — supply plenum / return riser	1.00	45.00	\N	\N	\N	\N
3099	287	20	standard	CG 70F 2.5S214R454 — 58SB0B070M14 12	1.00	1452.30	\N		CG 70F 2.5S214R454	\N
3100	277	40	standard	Flex duct	1000.00	4.70	\N	\N	\N	\N
3101	277	60	standard	Refrigerant line set — copper	50.00	12.10	\N	\N	\N	\N
3102	277	70	standard	Refrigerant line insulation (Rubatex R3)	50.00	2.80	\N	\N	\N	\N
3103	277	90	standard	Condensate drain line — PVC	50.00	2.20	\N	\N	\N	\N
3104	277	130	standard	Mastic — fittings and boots	1.00	30.00	\N	\N	\N	\N
1529	146	00	standard	Equipment — HVAC system package	1.00	2290.83	\N	rough	\N	\N
1530	146	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
1531	146	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
1532	146	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1533	146	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1534	146	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
1535	146	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1536	146	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1537	146	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1538	146	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1539	147	00	standard	Equipment — HVAC system package	1.00	2705.30	\N	rough	\N	\N
1540	147	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
1541	147	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1542	147	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
1543	147	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1544	147	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1545	147	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
1546	147	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1547	147	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
1548	147	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1549	148	00	standard	Equipment — HVAC system package	1.00	2216.73	\N	rough	\N	\N
1550	148	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
1551	148	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1552	148	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1553	148	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
1554	148	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1555	148	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
1556	148	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
1557	148	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1558	148	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1559	148	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
1560	148	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
1561	148	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1562	149	00	standard	Equipment — HVAC system package	1.00	5212.02	\N	rough	\N	\N
1563	149	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1564	149	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
1565	149	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
1566	149	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1567	149	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1568	149	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
1569	149	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1570	149	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
1571	150	00	standard	Equipment — HVAC system package	1.00	2704.03	\N	rough	\N	\N
1572	150	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
1573	150	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1574	150	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1575	150	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
1576	150	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1577	150	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
1578	150	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
1579	150	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1580	150	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1581	151	00	standard	Equipment — HVAC system package	1.00	4867.39	\N	rough	\N	\N
1582	151	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1583	151	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1584	151	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
1585	151	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1586	151	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1587	151	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
1588	151	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
1589	151	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1590	151	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1591	151	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
1592	151	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
1593	151	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
1594	152	00	standard	Equipment — HVAC system package	1.00	3489.99	\N	rough	\N	\N
1595	152	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1596	152	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
1597	152	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
1598	152	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1599	152	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
1600	152	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
1601	152	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1602	152	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1603	152	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1604	153	00	standard	Equipment — HVAC system package	1.00	2165.83	\N	rough	\N	\N
1605	153	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
1606	153	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
1607	153	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1608	153	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1609	153	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1610	153	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
1611	153	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
1612	153	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1613	154	00	standard	Equipment — HVAC system package	1.00	3191.93	\N	rough	\N	\N
1614	154	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1615	154	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
1616	154	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
1617	154	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
1618	154	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1619	154	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
1620	154	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
1621	154	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1622	154	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1623	154	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1624	154	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1625	154	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
1626	155	00	standard	Equipment — HVAC system package	1.00	4138.87	\N	rough	\N	\N
1627	155	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1628	155	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
1629	155	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
1630	155	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1631	155	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1632	155	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
1633	155	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
1634	155	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
1635	155	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
1636	155	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
1637	155	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1638	156	00	standard	Equipment — HVAC system package	1.00	5081.12	\N	rough	\N	\N
1639	156	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1640	156	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
1641	156	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1642	156	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1643	156	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1644	156	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
1645	156	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
1646	156	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
1647	156	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
1648	156	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1649	156	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
1650	157	00	standard	Equipment — HVAC system package	1.00	5438.01	\N	rough	\N	\N
1651	157	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
1652	157	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
1653	157	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1654	157	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1655	157	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1656	157	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
1657	157	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1658	157	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
1659	157	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
1660	158	00	standard	Equipment — HVAC system package	1.00	2235.44	\N	rough	\N	\N
1661	158	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
1662	158	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1663	158	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
1664	158	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1665	158	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
1666	158	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1667	158	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1668	158	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
1669	158	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1670	158	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
1671	159	00	standard	Equipment — HVAC system package	1.00	2415.95	\N	rough	\N	\N
1672	159	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1673	159	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1674	159	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
1675	159	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
1676	159	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1677	159	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1678	159	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1679	159	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1680	160	00	standard	Equipment — HVAC system package	1.00	2282.68	\N	rough	\N	\N
1681	160	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
1682	160	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
1683	160	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1684	160	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1685	160	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
1686	160	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1687	160	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1688	160	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1689	160	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
1690	161	00	standard	Equipment — HVAC system package	1.00	2343.71	\N	rough	\N	\N
1691	161	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
1692	161	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
1693	161	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1694	161	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
1695	161	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
1696	161	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1697	161	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1698	161	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
1699	162	00	standard	Equipment — HVAC system package	1.00	2196.14	\N	rough	\N	\N
1700	162	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1701	162	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
1702	162	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1703	162	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1704	162	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1705	162	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1706	162	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1707	162	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1708	162	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1709	163	00	standard	Equipment — HVAC system package	1.00	3715.05	\N	rough	\N	\N
1710	163	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1711	163	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1712	163	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
1713	163	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1714	163	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1715	163	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1716	163	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1717	163	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
1718	164	00	standard	Equipment — HVAC system package	1.00	2792.88	\N	rough	\N	\N
1719	164	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
1720	164	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
1721	164	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1722	164	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1723	164	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1724	164	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1725	164	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
1726	164	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
1727	164	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1728	164	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
1729	165	00	standard	Equipment — HVAC system package	1.00	4011.16	\N	rough	\N	\N
1730	165	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1731	165	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1732	165	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
1733	165	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1734	165	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
1735	165	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
1736	165	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
1737	165	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
1738	165	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
1739	165	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1740	166	00	standard	Equipment — HVAC system package	1.00	4691.12	\N	rough	\N	\N
1741	166	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
1742	166	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
1743	166	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1744	166	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
1745	166	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
1746	166	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
1747	166	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1748	166	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1749	166	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1750	167	00	standard	Equipment — HVAC system package	1.00	2528.17	\N	rough	\N	\N
1751	167	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
1752	167	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1753	167	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1754	167	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
1755	167	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
1756	167	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1757	167	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1758	167	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
1759	168	00	standard	Equipment — HVAC system package	1.00	3989.80	\N	rough	\N	\N
1760	168	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
1761	168	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1762	168	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1763	168	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
1764	168	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1765	168	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
1766	168	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1767	168	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
1768	169	00	standard	Equipment — HVAC system package	1.00	3828.28	\N	rough	\N	\N
1769	169	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
1770	169	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
1771	169	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1772	169	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
1773	169	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1774	169	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1775	169	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
1776	169	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
1777	169	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
1778	169	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1779	169	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
1780	169	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
1781	170	00	standard	Equipment — HVAC system package	1.00	2615.56	\N	rough	\N	\N
1782	170	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
1783	170	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1784	170	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1785	170	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
1786	170	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
1787	170	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1788	170	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
1789	170	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
1790	170	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
1791	171	00	standard	Equipment — HVAC system package	1.00	3773.62	\N	rough	\N	\N
1792	171	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1793	171	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
1794	171	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
1795	171	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
1796	171	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
1797	171	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
1798	171	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1799	171	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
1800	172	00	standard	Equipment — HVAC system package	1.00	3670.78	\N	rough	\N	\N
1801	172	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
1802	172	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1803	172	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1804	172	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
1805	172	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
1806	172	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1807	172	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1808	172	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1809	172	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1810	172	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
1811	173	00	standard	Equipment — HVAC system package	1.00	3377.52	\N	rough	\N	\N
1812	173	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
1813	173	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
1814	173	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
1815	173	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1816	173	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1817	173	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
1818	173	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1819	173	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1820	173	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1821	173	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
1822	173	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1823	174	00	standard	Equipment — HVAC system package	1.00	4122.74	\N	rough	\N	\N
1824	174	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1825	174	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
1826	174	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1827	174	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
1828	174	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1829	174	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1830	174	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
1831	174	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1832	174	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1833	174	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1834	174	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1835	175	00	standard	Equipment — HVAC system package	1.00	2092.15	\N	rough	\N	\N
1836	175	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
1837	175	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
1838	175	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1839	175	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1840	175	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1841	175	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
1842	175	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1843	175	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1844	175	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1845	176	00	standard	Equipment — HVAC system package	1.00	2584.07	\N	rough	\N	\N
1846	176	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1847	176	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1848	176	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1849	176	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1850	176	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1851	176	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
1852	176	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
1853	176	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
1854	176	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
1855	177	00	standard	Equipment — HVAC system package	1.00	2397.75	\N	rough	\N	\N
1856	177	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1857	177	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1858	177	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
1859	177	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1860	177	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
1861	177	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1862	177	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1863	177	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
1864	177	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
1865	178	00	standard	Equipment — HVAC system package	1.00	5227.11	\N	rough	\N	\N
1866	178	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
1867	178	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
1868	178	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
1869	178	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1870	178	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
1871	178	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
1872	178	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1873	178	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1874	178	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
1875	179	00	standard	Equipment — HVAC system package	1.00	4287.21	\N	rough	\N	\N
1876	179	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
1877	179	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
1878	179	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
1879	179	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1880	179	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1881	179	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
1882	179	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
1883	179	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1884	180	00	standard	Equipment — HVAC system package	1.00	5205.65	\N	rough	\N	\N
1885	180	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
1886	180	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
1887	180	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
1888	180	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1889	180	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1890	180	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
1891	180	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
1892	180	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1893	180	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
1894	180	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
1895	180	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1896	180	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
1897	181	00	standard	Equipment — HVAC system package	1.00	2756.01	\N	rough	\N	\N
1898	181	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
1899	181	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1900	181	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
1901	181	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
1902	181	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
1903	181	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1904	181	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1905	181	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1906	182	00	standard	Equipment — HVAC system package	1.00	3335.00	\N	rough	\N	\N
1907	182	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
1908	182	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1909	182	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
1910	182	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
1911	182	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1912	182	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1913	182	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1914	182	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
1915	182	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
1916	182	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
1917	183	00	standard	Equipment — HVAC system package	1.00	2078.94	\N	rough	\N	\N
1918	183	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1919	183	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
1920	183	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
1921	183	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1922	183	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1923	183	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
1924	183	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
1925	183	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
1926	183	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1927	183	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1928	183	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
1929	183	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
1930	184	00	standard	Equipment — HVAC system package	1.00	2198.77	\N	rough	\N	\N
1931	184	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1932	184	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2013	191	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
1933	184	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
1934	184	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
1935	184	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
1936	184	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
1937	184	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1938	184	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
1939	184	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
1940	185	00	standard	Equipment — HVAC system package	1.00	3099.78	\N	rough	\N	\N
1941	185	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
1942	185	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
1943	185	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
1944	185	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
1945	185	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
1946	185	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
1947	185	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
1948	185	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1949	185	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
1950	185	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
1951	185	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
1952	186	00	standard	Equipment — HVAC system package	1.00	4817.97	\N	rough	\N	\N
1953	186	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1954	186	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
1955	186	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
1956	186	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
1957	186	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
1958	186	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
1959	186	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
1960	186	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
1961	186	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
1962	186	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
1963	186	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
1964	187	00	standard	Equipment — HVAC system package	1.00	2551.51	\N	rough	\N	\N
1965	187	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
1966	187	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
1967	187	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
1968	187	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
1969	187	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1970	187	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
1971	187	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
1972	187	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
1973	188	00	standard	Equipment — HVAC system package	1.00	5063.40	\N	rough	\N	\N
1974	188	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
1975	188	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
1976	188	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
1977	188	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
1978	188	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
1979	188	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
1980	188	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
1981	188	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
1982	188	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
1983	188	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
1984	188	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
1985	189	00	standard	Equipment — HVAC system package	1.00	5305.32	\N	rough	\N	\N
1986	189	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
1987	189	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
1988	189	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
1989	189	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1990	189	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
1991	189	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
1992	189	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
1993	189	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
1994	190	00	standard	Equipment — HVAC system package	1.00	2842.46	\N	rough	\N	\N
1995	190	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
1996	190	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
1997	190	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
1998	190	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
1999	190	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2000	190	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2001	190	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2002	190	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2003	190	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2004	190	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2005	190	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2006	190	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2007	191	00	standard	Equipment — HVAC system package	1.00	2307.86	\N	rough	\N	\N
2008	191	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2009	191	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2010	191	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2011	191	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2012	191	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2014	191	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2015	191	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2016	191	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2017	191	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2018	192	00	standard	Equipment — HVAC system package	1.00	5032.49	\N	rough	\N	\N
2019	192	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2020	192	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2021	192	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2022	192	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2023	192	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2024	192	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2025	192	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2026	192	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2027	192	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2028	192	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2029	192	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2030	192	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2031	193	00	standard	Equipment — HVAC system package	1.00	2081.65	\N	rough	\N	\N
2032	193	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2033	193	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2034	193	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2035	193	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2036	193	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2037	193	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2038	193	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2039	193	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2040	193	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2041	193	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2042	194	00	standard	Equipment — HVAC system package	1.00	2554.76	\N	rough	\N	\N
2043	194	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2044	194	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2045	194	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
2046	194	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2047	194	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2048	194	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2049	194	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2050	194	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2051	194	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2052	194	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2053	194	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2054	194	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2055	195	00	standard	Equipment — HVAC system package	1.00	5415.10	\N	rough	\N	\N
2056	195	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2057	195	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2058	195	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2059	195	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2060	195	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2061	195	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2062	195	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2063	195	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2064	195	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2065	195	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2066	196	00	standard	Equipment — HVAC system package	1.00	5265.32	\N	rough	\N	\N
2067	196	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2068	196	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2069	196	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2070	196	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2071	196	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2072	196	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2073	196	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2074	196	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2075	196	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2076	196	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2077	196	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2078	196	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2079	197	00	standard	Equipment — HVAC system package	1.00	5321.52	\N	rough	\N	\N
2080	197	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2081	197	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2082	197	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2083	197	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2084	197	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2085	197	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2086	197	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2087	197	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2088	197	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2089	197	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2090	197	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2091	198	00	standard	Equipment — HVAC system package	1.00	2771.00	\N	rough	\N	\N
2092	198	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2093	198	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2094	198	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2095	198	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2096	198	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2097	198	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2098	198	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2099	198	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2100	199	00	standard	Equipment — HVAC system package	1.00	3087.66	\N	rough	\N	\N
2101	199	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2102	199	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2103	199	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2104	199	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2105	199	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2106	199	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2107	199	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2108	199	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2109	199	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2110	200	00	standard	Equipment — HVAC system package	1.00	2104.19	\N	rough	\N	\N
2111	200	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2112	200	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2113	200	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2114	200	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2115	200	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2116	200	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2117	200	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2118	200	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2119	200	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2120	200	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2121	200	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2122	200	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2123	201	00	standard	Equipment — HVAC system package	1.00	3894.16	\N	rough	\N	\N
2124	201	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2125	201	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2126	201	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2127	201	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2128	201	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2129	201	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2130	201	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2131	201	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2132	202	00	standard	Equipment — HVAC system package	1.00	2791.75	\N	rough	\N	\N
2133	202	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2134	202	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2135	202	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2136	202	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2137	202	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2138	202	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2139	202	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2140	202	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2141	202	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2142	202	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2143	202	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2144	203	00	standard	Equipment — HVAC system package	1.00	4886.06	\N	rough	\N	\N
2145	203	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2146	203	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2147	203	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2148	203	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2149	203	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2150	203	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2151	203	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2152	203	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2153	204	00	standard	Equipment — HVAC system package	1.00	4618.48	\N	rough	\N	\N
2154	204	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2155	204	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2156	204	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2157	204	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2158	204	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2159	204	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2160	204	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2161	204	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2162	204	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2163	204	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2164	204	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2165	204	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2166	205	00	standard	Equipment — HVAC system package	1.00	2615.46	\N	rough	\N	\N
2167	205	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2168	205	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2169	205	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2170	205	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2171	205	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2172	205	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2173	205	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2174	205	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2175	205	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2176	205	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2177	205	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2178	205	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2179	206	00	standard	Equipment — HVAC system package	1.00	1916.26	\N	rough	\N	\N
2180	206	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2181	206	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2182	206	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2183	206	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2184	206	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2185	206	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2186	206	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2187	206	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2188	206	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2189	206	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2190	206	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2191	206	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2192	207	00	standard	Equipment — HVAC system package	1.00	5395.60	\N	rough	\N	\N
2193	207	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2194	207	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2195	207	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2196	207	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2197	207	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2198	207	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2199	207	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2200	207	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2201	208	00	standard	Equipment — HVAC system package	1.00	2411.58	\N	rough	\N	\N
2202	208	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2203	208	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2204	208	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2205	208	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2206	208	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2207	208	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2208	208	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2209	208	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2210	208	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2211	208	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2212	208	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2213	208	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2214	209	00	standard	Equipment — HVAC system package	1.00	5373.92	\N	rough	\N	\N
2215	209	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2216	209	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2217	209	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2218	209	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2219	209	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2220	209	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2221	209	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2222	209	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2223	210	00	standard	Equipment — HVAC system package	1.00	3452.16	\N	rough	\N	\N
2224	210	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2225	210	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2226	210	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2227	210	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2228	210	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2229	210	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2230	210	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2231	210	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2232	210	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2233	211	00	standard	Equipment — HVAC system package	1.00	4738.90	\N	rough	\N	\N
2234	211	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2235	211	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2236	211	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2237	211	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2238	211	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2239	211	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2240	211	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2241	211	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
2242	211	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2243	211	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2244	212	00	standard	Equipment — HVAC system package	1.00	3811.29	\N	rough	\N	\N
2245	212	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2246	212	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2247	212	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2248	212	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2249	212	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2250	212	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2251	212	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2252	212	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2253	212	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2254	212	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2255	213	00	standard	Equipment — HVAC system package	1.00	5155.27	\N	rough	\N	\N
2256	213	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2257	213	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2258	213	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2259	213	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2260	213	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2261	213	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2262	213	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2263	213	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2264	213	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2265	213	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2266	213	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2267	214	00	standard	Equipment — HVAC system package	1.00	2763.90	\N	rough	\N	\N
2268	214	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2269	214	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2270	214	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2271	214	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2272	214	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2273	214	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2274	214	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2275	214	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2276	214	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2277	214	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2278	214	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2279	215	00	standard	Equipment — HVAC system package	1.00	5009.29	\N	rough	\N	\N
2280	215	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2281	215	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2282	215	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2283	215	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2284	215	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2285	215	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2286	215	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2287	215	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2288	215	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2289	216	00	standard	Equipment — HVAC system package	1.00	5086.82	\N	rough	\N	\N
2290	216	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2291	216	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2292	216	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2293	216	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2294	216	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2295	216	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2296	216	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2297	216	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2298	216	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2299	216	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2300	216	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2301	216	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2302	217	00	standard	Equipment — HVAC system package	1.00	2201.72	\N	rough	\N	\N
2303	217	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2304	217	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2305	217	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2306	217	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2307	217	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2308	217	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2309	217	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2310	217	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2311	217	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2312	217	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2313	218	00	standard	Equipment — HVAC system package	1.00	2624.96	\N	rough	\N	\N
2314	218	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2315	218	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2316	218	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2317	218	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2318	218	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2319	218	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2320	218	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2321	218	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2322	218	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2323	218	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2324	219	00	standard	Equipment — HVAC system package	1.00	2900.06	\N	rough	\N	\N
2325	219	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2326	219	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2327	219	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2328	219	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2329	219	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2330	219	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2331	219	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2332	219	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2333	219	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2334	220	00	standard	Equipment — HVAC system package	1.00	2448.02	\N	rough	\N	\N
2335	220	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2336	220	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2337	220	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2338	220	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2339	220	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2340	220	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2341	220	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2342	220	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2343	220	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2344	220	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2345	220	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2346	221	00	standard	Equipment — HVAC system package	1.00	4384.45	\N	rough	\N	\N
2347	221	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2348	221	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2349	221	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2350	221	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2351	221	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2352	221	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2353	221	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2354	221	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2355	221	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2356	221	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2357	221	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2358	222	00	standard	Equipment — HVAC system package	1.00	3837.71	\N	rough	\N	\N
2359	222	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2360	222	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2361	222	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2362	222	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2363	222	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2364	222	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2365	222	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2366	222	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2367	222	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2368	223	00	standard	Equipment — HVAC system package	1.00	3979.54	\N	rough	\N	\N
2369	223	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2370	223	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2371	223	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2372	223	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2373	223	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2374	223	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2375	223	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2376	223	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2377	223	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
2378	223	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2379	223	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2380	224	00	standard	Equipment — HVAC system package	1.00	4078.41	\N	rough	\N	\N
2381	224	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2382	224	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2383	224	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2384	224	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2385	224	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2386	224	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2387	224	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2388	224	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2389	224	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2390	225	00	standard	Equipment — HVAC system package	1.00	1974.85	\N	rough	\N	\N
2391	225	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2392	225	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2393	225	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2394	225	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2395	225	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2396	225	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2397	225	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2398	225	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2399	225	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2400	225	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2401	225	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2402	225	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2403	226	00	standard	Equipment — HVAC system package	1.00	2963.93	\N	rough	\N	\N
2404	226	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2405	226	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2406	226	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2407	226	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2408	226	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2409	226	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2410	226	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2411	226	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2412	226	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2413	227	00	standard	Equipment — HVAC system package	1.00	3488.23	\N	rough	\N	\N
2414	227	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2415	227	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2416	227	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2417	227	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2418	227	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2419	227	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2420	227	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2421	227	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2422	227	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2423	227	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2424	228	00	standard	Equipment — HVAC system package	1.00	4903.51	\N	rough	\N	\N
2425	228	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2426	228	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2427	228	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2428	228	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2429	228	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2430	228	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2431	228	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2432	228	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2433	228	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2434	228	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2435	228	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2436	229	00	standard	Equipment — HVAC system package	1.00	1931.91	\N	rough	\N	\N
2437	229	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2438	229	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2439	229	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2440	229	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2441	229	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2442	229	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2443	229	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2444	229	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2445	229	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2446	230	00	standard	Equipment — HVAC system package	1.00	3771.38	\N	rough	\N	\N
2447	230	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2448	230	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2449	230	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2450	230	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2451	230	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2452	230	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2453	230	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2454	230	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2455	231	00	standard	Equipment — HVAC system package	1.00	5424.44	\N	rough	\N	\N
2456	231	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2457	231	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2458	231	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2459	231	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2460	231	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2461	231	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2462	231	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2463	231	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2464	231	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2465	231	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2466	232	00	standard	Equipment — HVAC system package	1.00	5091.02	\N	rough	\N	\N
2467	232	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2468	232	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2469	232	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2470	232	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2471	232	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2472	232	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2473	232	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2474	232	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2475	232	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2476	232	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2477	233	00	standard	Equipment — HVAC system package	1.00	3335.41	\N	rough	\N	\N
2478	233	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2479	233	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2480	233	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2481	233	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2482	233	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2483	233	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2484	233	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2485	233	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2486	233	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2487	233	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2488	233	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2489	233	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2490	234	00	standard	Equipment — HVAC system package	1.00	4170.50	\N	rough	\N	\N
2491	234	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2492	234	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2493	234	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2494	234	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2495	234	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2496	234	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2497	234	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2498	234	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2499	234	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2500	234	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2501	234	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2502	234	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2503	235	00	standard	Equipment — HVAC system package	1.00	4227.51	\N	rough	\N	\N
2504	235	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2505	235	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2506	235	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2507	235	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2508	235	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2509	235	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2510	235	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2511	235	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2512	235	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2513	235	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2514	236	00	standard	Equipment — HVAC system package	1.00	2770.45	\N	rough	\N	\N
2515	236	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2516	236	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2517	236	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2518	236	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2519	236	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2520	236	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2521	236	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2522	236	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2523	236	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2524	236	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2525	236	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2526	237	00	standard	Equipment — HVAC system package	1.00	3714.93	\N	rough	\N	\N
2527	237	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2528	237	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2529	237	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2530	237	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2531	237	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2532	237	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2533	237	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2534	237	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2535	238	00	standard	Equipment — HVAC system package	1.00	4414.87	\N	rough	\N	\N
2536	238	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2537	238	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2538	238	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2539	238	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2540	238	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2541	238	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2542	238	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2543	238	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2544	238	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2545	238	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2546	238	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2547	238	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2548	239	00	standard	Equipment — HVAC system package	1.00	4542.55	\N	rough	\N	\N
2549	239	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2550	239	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2551	239	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2552	239	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2553	239	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2554	239	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2555	239	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2556	239	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2557	239	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2558	239	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2559	239	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2560	239	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2561	240	00	standard	Equipment — HVAC system package	1.00	3340.01	\N	rough	\N	\N
2562	240	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2563	240	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2564	240	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2565	240	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2566	240	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2567	240	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2568	240	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2569	240	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2570	240	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2571	241	00	standard	Equipment — HVAC system package	1.00	4644.94	\N	rough	\N	\N
2572	241	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2573	241	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2574	241	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2575	241	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2576	241	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2577	241	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2578	241	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2579	241	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2580	241	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2581	241	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2582	242	00	standard	Equipment — HVAC system package	1.00	2112.89	\N	rough	\N	\N
2583	242	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2584	242	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2585	242	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
2586	242	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2587	242	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2588	242	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2589	242	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2590	242	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2591	242	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2592	242	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2593	242	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2594	242	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2595	243	00	standard	Equipment — HVAC system package	1.00	4940.12	\N	rough	\N	\N
2596	243	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2597	243	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2598	243	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2599	243	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2600	243	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2601	243	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2602	243	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2603	243	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2604	243	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2605	244	00	standard	Equipment — HVAC system package	1.00	2828.09	\N	rough	\N	\N
2606	244	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2607	244	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2608	244	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2609	244	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2610	244	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2611	244	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2612	244	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2613	244	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2614	244	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2615	244	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2616	244	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2617	244	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2618	245	00	standard	Equipment — HVAC system package	1.00	2823.90	\N	rough	\N	\N
2619	245	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2620	245	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2621	245	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2622	245	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2623	245	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2624	245	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2625	245	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2626	245	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2627	246	00	standard	Equipment — HVAC system package	1.00	5209.34	\N	rough	\N	\N
2628	246	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2629	246	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2630	246	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2631	246	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2632	246	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2633	246	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2634	246	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2635	246	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2636	246	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2637	246	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2638	246	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2639	246	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2640	247	00	standard	Equipment — HVAC system package	1.00	5487.52	\N	rough	\N	\N
2641	247	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
2642	247	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2643	247	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2644	247	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2645	247	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2646	247	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2647	247	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2648	247	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2649	248	00	standard	Equipment — HVAC system package	1.00	5436.53	\N	rough	\N	\N
2650	248	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2651	248	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2652	248	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2653	248	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2654	248	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2655	248	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2656	248	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2657	248	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2658	248	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2659	248	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2660	249	00	standard	Equipment — HVAC system package	1.00	3315.21	\N	rough	\N	\N
2661	249	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2662	249	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2663	249	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2664	249	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2665	249	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2666	249	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2667	249	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2668	249	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2669	249	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2670	249	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2671	249	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2672	249	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2673	250	00	standard	Equipment — HVAC system package	1.00	3758.41	\N	rough	\N	\N
2674	250	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2675	250	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	trim	\N	\N
2676	250	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2677	250	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2678	250	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2679	250	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2680	250	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2681	250	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2682	250	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2683	250	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2684	251	00	standard	Equipment — HVAC system package	1.00	2197.86	\N	rough	\N	\N
2685	251	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2686	251	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2687	251	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2688	251	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2689	251	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2690	251	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2691	251	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2692	251	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2693	252	00	standard	Equipment — HVAC system package	1.00	3879.78	\N	rough	\N	\N
2694	252	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2695	252	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2696	252	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2697	252	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2698	252	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2699	252	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2700	252	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2701	252	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2702	252	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2703	253	00	standard	Equipment — HVAC system package	1.00	4432.30	\N	rough	\N	\N
2704	253	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2705	253	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2706	253	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2707	253	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2708	253	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2709	253	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2710	253	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2711	253	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2712	253	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2713	253	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2714	254	00	standard	Equipment — HVAC system package	1.00	5331.14	\N	rough	\N	\N
2715	254	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2716	254	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2717	254	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2718	254	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2719	254	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2720	254	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2957	276	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2721	254	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2722	254	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2723	255	00	standard	Equipment — HVAC system package	1.00	4581.15	\N	rough	\N	\N
2724	255	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2725	255	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2726	255	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2727	255	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2728	255	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2729	255	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2730	255	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2731	255	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2732	255	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2733	255	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2734	255	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2735	256	00	standard	Equipment — HVAC system package	1.00	3990.82	\N	rough	\N	\N
2736	256	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2737	256	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2738	256	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2739	256	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2740	256	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2741	256	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2742	256	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2743	256	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2744	256	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2745	256	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2746	257	00	standard	Equipment — HVAC system package	1.00	3533.18	\N	rough	\N	\N
2747	257	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2748	257	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2749	257	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2750	257	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2751	257	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2752	257	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2753	257	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2754	257	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2755	257	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2756	257	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2757	258	00	standard	Equipment — HVAC system package	1.00	2508.59	\N	rough	\N	\N
2758	258	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2759	258	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2760	258	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2761	258	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2762	258	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2763	258	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2764	258	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2765	258	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2766	258	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2767	258	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2768	258	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2769	258	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2770	259	00	standard	Equipment — HVAC system package	1.00	5120.38	\N	rough	\N	\N
2771	259	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2772	259	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2773	259	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2774	259	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2775	259	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
2776	259	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2777	259	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2778	259	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2779	259	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2780	260	00	standard	Equipment — HVAC system package	1.00	3847.62	\N	rough	\N	\N
2781	260	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2782	260	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2783	260	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2784	260	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2785	260	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2786	260	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2787	260	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2788	260	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2789	260	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2790	261	00	standard	Equipment — HVAC system package	1.00	4615.34	\N	rough	\N	\N
2791	261	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2792	261	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2793	261	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2794	261	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2795	261	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
2796	261	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2797	261	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2798	261	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
2799	261	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2800	261	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2801	262	00	standard	Equipment — HVAC system package	1.00	4558.44	\N	rough	\N	\N
2802	262	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2803	262	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2804	262	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2805	262	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2806	262	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2807	262	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2808	262	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2809	262	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2810	262	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2811	263	00	standard	Equipment — HVAC system package	1.00	1824.48	\N	rough	\N	\N
2812	263	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2813	263	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2814	263	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2815	263	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2816	263	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2817	263	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2818	263	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2819	263	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2820	263	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2821	263	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2822	264	00	standard	Equipment — HVAC system package	1.00	4749.34	\N	rough	\N	\N
2823	264	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2824	264	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2825	264	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2826	264	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
2827	264	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2828	264	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2829	264	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2830	264	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2831	264	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
2832	264	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2833	264	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2834	265	00	standard	Equipment — HVAC system package	1.00	5291.51	\N	rough	\N	\N
2835	265	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2836	265	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2837	265	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2838	265	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2839	265	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2840	265	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2841	265	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2842	265	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2843	266	00	standard	Equipment — HVAC system package	1.00	2852.84	\N	rough	\N	\N
2844	266	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2845	266	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2846	266	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2847	266	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2848	266	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2849	266	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2850	266	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2851	266	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
2852	266	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2853	267	00	standard	Equipment — HVAC system package	1.00	4078.14	\N	rough	\N	\N
2854	267	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2855	267	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2856	267	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2857	267	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2858	267	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2859	267	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2860	267	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2861	267	20	standard	Attic access platform	1.00	75.00	\N	final	\N	\N
2862	267	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2863	267	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2864	267	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2865	267	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2866	268	00	standard	Equipment — HVAC system package	1.00	2893.83	\N	rough	\N	\N
2867	268	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2868	268	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2869	268	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2870	268	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2871	268	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
2872	268	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2873	268	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2874	268	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2875	268	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2876	268	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2877	268	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2878	268	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2879	269	00	standard	Equipment — HVAC system package	1.00	2626.14	\N	rough	\N	\N
2880	269	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2881	269	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2882	269	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2883	269	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2884	269	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
2885	269	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2886	269	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2887	269	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2888	269	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2889	269	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2890	269	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2891	270	00	standard	Equipment — HVAC system package	1.00	3134.85	\N	rough	\N	\N
2892	270	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2893	270	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2894	270	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2895	270	20	standard	Attic access platform	1.00	75.00	\N	trim	\N	\N
2896	270	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2897	270	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	final	\N	\N
2898	270	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2899	270	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
2900	270	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2901	270	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
2902	271	00	standard	Equipment — HVAC system package	1.00	4920.12	\N	rough	\N	\N
2903	271	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2904	271	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2905	271	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2906	271	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2907	271	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2908	271	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2909	271	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2910	271	18	standard	Electrical disconnect	1.00	65.00	\N	final	\N	\N
2911	271	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2912	271	02	standard	Canvas connector supply/return	1.00	45.00	\N	rough	\N	\N
2913	271	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2914	272	00	standard	Equipment — HVAC system package	1.00	4982.29	\N	rough	\N	\N
2915	272	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2916	272	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2917	272	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2918	272	20	standard	Attic access platform	1.00	75.00	\N	rough	\N	\N
2919	272	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2920	272	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2921	272	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2922	272	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
2923	272	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
2924	272	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
2925	273	00	standard	Equipment — HVAC system package	1.00	4004.65	\N	rough	\N	\N
2926	273	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2927	273	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2928	273	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
2929	273	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2930	273	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2931	273	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2932	273	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2933	273	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	rough	\N	\N
2934	273	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2935	274	00	standard	Equipment — HVAC system package	1.00	2771.61	\N	rough	\N	\N
2936	274	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2937	274	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2938	274	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2939	274	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
2940	274	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
2941	274	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2942	274	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
2943	274	16	standard	Thermostat wiring	1.00	40.00	\N	final	\N	\N
2944	274	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
2945	275	00	standard	Equipment — HVAC system package	1.00	3864.96	\N	rough	\N	\N
2946	275	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2947	275	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
2948	275	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2949	275	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
2950	275	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
2951	275	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
2952	275	09	standard	Mastic duct sealing package	1.00	70.00	\N	final	\N	\N
2953	275	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
2954	276	00	standard	Equipment — HVAC system package	1.00	5302.93	\N	rough	\N	\N
2955	276	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
2956	276	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
2958	276	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2959	276	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2960	276	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
2961	276	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
2962	276	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2963	276	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
2964	276	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2965	276	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
2966	277	00	standard	Equipment — HVAC system package	1.00	4792.98	\N	rough	\N	\N
2967	277	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2968	277	11	standard	Sheet metal — return plenum	1.00	85.00	\N	rough	\N	\N
2969	277	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
2970	277	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	rough	\N	\N
2971	277	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2972	277	09	standard	Mastic duct sealing package	1.00	70.00	\N	rough	\N	\N
2973	277	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2974	277	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2975	277	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2976	277	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
2977	277	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2978	277	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
2979	278	00	standard	Equipment — HVAC system package	1.00	5133.63	\N	rough	\N	\N
2980	278	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
2981	278	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	trim	\N	\N
2982	278	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
2983	278	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
2984	278	14	standard	Start-up and commissioning	1.00	125.00	\N	rough	\N	\N
2985	278	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2986	278	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
2987	278	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
2988	278	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	trim	\N	\N
2989	278	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
2990	278	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
2991	279	00	standard	Equipment — HVAC system package	1.00	2560.99	\N	rough	\N	\N
2992	279	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
2993	279	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
2994	279	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
2995	279	03	standard	Fire stopping — band board penetrations	1.00	55.00	\N	final	\N	\N
2996	279	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
2997	279	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
2998	279	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
2999	279	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
3000	280	00	standard	Equipment — HVAC system package	1.00	3655.45	\N	rough	\N	\N
3001	280	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
3002	280	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
3003	280	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
3004	280	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
3005	280	07	standard	Service valve locking caps	1.00	15.00	\N	rough	\N	\N
3006	280	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
3007	280	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	final	\N	\N
3008	280	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
3009	280	08	standard	Condensate drain line — PVC	1.00	45.00	\N	final	\N	\N
3010	280	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
3011	280	18	standard	Electrical disconnect	1.00	65.00	\N	trim	\N	\N
3012	281	00	standard	Equipment — HVAC system package	1.00	3468.06	\N	rough	\N	\N
3013	281	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
3014	281	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
3015	281	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
3016	281	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
3017	281	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
3018	281	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
3019	281	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
3020	281	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
3021	281	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
3022	282	00	standard	Equipment — HVAC system package	1.00	3767.66	\N	rough	\N	\N
3023	282	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	rough	\N	\N
3024	282	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
3025	282	15	standard	Lineset insulation wrap	1.00	55.00	\N	final	\N	\N
3026	282	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
3027	282	19	standard	Filter rack 1-inch	1.00	45.00	\N	trim	\N	\N
3028	282	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
3029	282	08	standard	Condensate drain line — PVC	1.00	45.00	\N	rough	\N	\N
3030	282	09	standard	Mastic duct sealing package	1.00	70.00	\N	trim	\N	\N
3031	282	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
3032	283	00	standard	Equipment — HVAC system package	1.00	3802.69	\N	rough	\N	\N
3033	283	05	standard	Bath fans run to exterior (50 CFM)	2.00	65.00	\N	rough	\N	\N
3034	283	06	standard	Float switch	1.00	35.00	\N	trim	\N	\N
3035	283	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
3036	283	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
3037	283	17	standard	Condensate pump	1.00	85.00	\N	rough	\N	\N
3038	283	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
3039	283	13	standard	Flex duct connectors / clamps	1.00	22.00	\N	trim	\N	\N
3040	283	14	standard	Start-up and commissioning	1.00	125.00	\N	final	\N	\N
3041	283	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	trim	\N	\N
3042	283	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
3043	283	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	trim	\N	\N
3044	283	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
3045	284	00	standard	Equipment — HVAC system package	1.00	4358.24	\N	rough	\N	\N
3046	284	04	standard	Refrigerant lines through band board	1.00	40.00	\N	final	\N	\N
3047	284	07	standard	Service valve locking caps	1.00	15.00	\N	trim	\N	\N
3048	284	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	rough	\N	\N
3049	284	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	final	\N	\N
3050	284	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
3051	284	02	standard	Canvas connector supply/return	1.00	45.00	\N	trim	\N	\N
3052	284	16	standard	Thermostat wiring	1.00	40.00	\N	rough	\N	\N
3053	284	11	standard	Sheet metal — return plenum	1.00	85.00	\N	trim	\N	\N
3054	284	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
3055	284	06	standard	Float switch	1.00	35.00	\N	rough	\N	\N
3056	284	15	standard	Lineset insulation wrap	1.00	55.00	\N	rough	\N	\N
3057	285	00	standard	Equipment — HVAC system package	1.00	3002.88	\N	rough	\N	\N
3058	285	14	standard	Start-up and commissioning	1.00	125.00	\N	trim	\N	\N
3059	285	11	standard	Sheet metal — return plenum	1.00	85.00	\N	final	\N	\N
3060	285	19	standard	Filter rack 1-inch	1.00	45.00	\N	final	\N	\N
3061	285	17	standard	Condensate pump	1.00	85.00	\N	final	\N	\N
3062	285	04	standard	Refrigerant lines through band board	1.00	40.00	\N	trim	\N	\N
3063	285	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
3064	285	18	standard	Electrical disconnect	1.00	65.00	\N	rough	\N	\N
3065	285	01	standard	Emergency pan under indoor equipment	1.00	35.00	\N	rough	\N	\N
3066	285	15	standard	Lineset insulation wrap	1.00	55.00	\N	trim	\N	\N
3067	285	12	standard	Flex duct (7-in, per run)	6.00	28.00	\N	final	\N	\N
3068	285	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
3069	286	00	standard	Equipment — HVAC system package	1.00	3046.29	\N	rough	\N	\N
3070	286	08	standard	Condensate drain line — PVC	1.00	45.00	\N	trim	\N	\N
3071	286	06	standard	Float switch	1.00	35.00	\N	final	\N	\N
3072	286	17	standard	Condensate pump	1.00	85.00	\N	trim	\N	\N
3073	286	19	standard	Filter rack 1-inch	1.00	45.00	\N	rough	\N	\N
3074	286	04	standard	Refrigerant lines through band board	1.00	40.00	\N	rough	\N	\N
3075	286	02	standard	Canvas connector supply/return	1.00	45.00	\N	final	\N	\N
3076	286	16	standard	Thermostat wiring	1.00	40.00	\N	trim	\N	\N
3077	286	07	standard	Service valve locking caps	1.00	15.00	\N	final	\N	\N
3078	286	10	standard	Sheet metal — supply plenum	1.00	95.00	\N	final	\N	\N
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plans (id, plan_number, estimator_name, estimator_initials, project_id, status, number_of_zones, house_type, notes, contracted_at, created_at, updated_at) FROM stdin;
3428	AD0010326	Administrator	AD	4253	complete	1	TYPE A		2026-03-26 11:19:10.224077	2026-03-26 11:12:25.629279	2026-03-26 11:19:14.36464
3369	AC0020425	Austin Cantrell	AC	4207	proposed	1	The Grandview	\N	\N	2025-04-05 10:23:11.1007	2026-03-26 10:23:11.080754
3368	AC0011025	Austin Cantrell	AC	4206	contracted	3	Elevation B	\N	2025-11-15 10:23:11.079585	2025-10-21 10:23:11.079585	2026-03-26 10:23:11.080754
3370	JD0010226	James Doyle	JD	4208	contracted	3	The Dorchester	\N	2026-03-05 10:23:11.105176	2026-02-10 10:23:11.105176	2026-03-26 10:23:11.080754
3371	SM0010925	Sarah Mitchell	SM	4209	lost	2	The Kingston	\N	\N	2025-09-27 10:23:11.111788	2026-03-26 10:23:11.080754
3372	AC0031225	Austin Cantrell	AC	4210	draft	1	The Queensbury	\N	\N	2025-12-19 10:23:11.115055	2026-03-26 10:23:11.080754
3373	PR0010625	Patrick Reeves	PR	4211	contracted	1	Model 2800	\N	2025-06-20 10:23:11.122729	2025-06-03 10:23:11.122729	2026-03-26 10:23:11.080754
3374	PR0020725	Patrick Reeves	PR	4212	contracted	1	The Fairfax	\N	2025-08-16 10:23:11.128353	2025-07-17 10:23:11.128353	2026-03-26 10:23:11.080754
3375	AC0041225	Austin Cantrell	AC	4213	complete	3	The Grandview	\N	2025-12-27 10:23:11.138294	2025-12-14 10:23:11.138294	2026-03-26 10:23:11.080754
3376	SM0020425	Sarah Mitchell	SM	4214	complete	2	The Hampton	\N	2025-05-26 10:23:11.146192	2025-04-30 10:23:11.146192	2026-03-26 10:23:11.080754
3377	PR0030525	Patrick Reeves	PR	4215	lost	1	The Grandview	\N	\N	2025-05-08 10:23:11.154042	2026-03-26 10:23:11.080754
3378	SM0030625	Sarah Mitchell	SM	4216	contracted	1	Model 2200	\N	2025-06-26 10:23:11.157471	2025-06-15 10:23:11.157471	2026-03-26 10:23:11.080754
3379	AC0051025	Austin Cantrell	AC	4217	proposed	1	Model 3200	\N	\N	2025-10-24 10:23:11.164399	2026-03-26 10:23:11.080754
3380	SM0040225	Sarah Mitchell	SM	4218	lost	1	The Berkshire	\N	\N	2025-02-20 10:23:11.17232	2026-03-26 10:23:11.080754
3381	SM0050525	Sarah Mitchell	SM	4219	draft	2	The Ashford	\N	\N	2025-05-08 10:23:11.180738	2026-03-26 10:23:11.080754
3382	JD0021025	James Doyle	JD	4220	draft	1	Model 2400	\N	\N	2025-10-03 10:23:11.185236	2026-03-26 10:23:11.080754
3383	JD0031125	James Doyle	JD	4221	contracted	2	The Jefferson	\N	2025-12-04 10:23:11.18876	2025-11-17 10:23:11.18876	2026-03-26 10:23:11.080754
3384	JD0040625	James Doyle	JD	4222	complete	2	Model 3600	\N	2025-07-21 10:23:11.19659	2025-06-24 10:23:11.19659	2026-03-26 10:23:11.080754
3385	AC0061025	Austin Cantrell	AC	4223	complete	3	The Lexington	\N	2025-11-15 10:23:11.19998	2025-10-18 10:23:11.19998	2026-03-26 10:23:11.080754
3386	PR0040725	Patrick Reeves	PR	4224	complete	2	The Berkshire	\N	2025-07-29 10:23:11.206055	2025-07-20 10:23:11.206055	2026-03-26 10:23:11.080754
3387	AC0071225	Austin Cantrell	AC	4225	lost	1	Model 2800	\N	\N	2025-12-10 10:23:11.210963	2026-03-26 10:23:11.080754
3388	JD0050325	James Doyle	JD	4226	contracted	1	The Ashford	\N	2025-03-15 10:23:11.217683	2025-03-02 10:23:11.217683	2026-03-26 10:23:11.080754
3389	JD0060725	James Doyle	JD	4227	contracted	1	Elevation C	\N	2025-08-17 10:23:11.224472	2025-07-23 10:23:11.224472	2026-03-26 10:23:11.080754
3390	PR0050126	Patrick Reeves	PR	4228	contracted	1	The Oxford	\N	2026-02-03 10:23:11.228361	2026-01-21 10:23:11.228361	2026-03-26 10:23:11.080754
3391	AC0080525	Austin Cantrell	AC	4229	proposed	1	The Fairfax	\N	\N	2025-05-07 10:23:11.231113	2026-03-26 10:23:11.080754
3392	AC0090825	Austin Cantrell	AC	4230	complete	2	The Richmond	\N	2025-09-10 10:23:11.236505	2025-08-17 10:23:11.236505	2026-03-26 10:23:11.080754
3393	SM0060225	Sarah Mitchell	SM	4231	lost	3	The Grandview	\N	\N	2025-02-19 10:23:11.241278	2026-03-26 10:23:11.080754
3394	SM0070425	Sarah Mitchell	SM	4232	draft	2	The Montrose	\N	\N	2025-04-15 10:23:11.248678	2026-03-26 10:23:11.080754
3395	JD0070925	James Doyle	JD	4233	draft	2	The Berkshire	\N	\N	2025-09-11 10:23:11.253759	2026-03-26 10:23:11.080754
3396	JD0080425	James Doyle	JD	4234	draft	1	Model 2200	\N	\N	2025-04-28 10:23:11.260067	2026-03-26 10:23:11.080754
3397	PR0061125	Patrick Reeves	PR	4235	proposed	1	Elevation D	\N	\N	2025-11-02 10:23:11.267616	2026-03-26 10:23:11.080754
3398	JD0091125	James Doyle	JD	4236	draft	1	The Montrose	\N	\N	2025-11-17 10:23:11.275239	2026-03-26 10:23:11.080754
3399	AC0101225	Austin Cantrell	AC	4237	proposed	3	The Inverness	\N	\N	2025-12-03 10:23:11.280151	2026-03-26 10:23:11.080754
3400	PR0070325	Patrick Reeves	PR	4238	lost	2	The Dorchester	\N	\N	2025-03-18 10:23:11.288556	2026-03-26 10:23:11.080754
3401	AC0110325	Austin Cantrell	AC	4239	contracted	1	Model 3200	\N	2025-04-15 10:23:11.294065	2025-03-21 10:23:11.294065	2026-03-26 10:23:11.080754
3402	AC0120625	Austin Cantrell	AC	4240	proposed	1	Elevation A	\N	\N	2025-06-07 10:23:11.298399	2026-03-26 10:23:11.080754
3403	PR0080425	Patrick Reeves	PR	4241	contracted	1	Elevation C	\N	2025-04-08 10:23:11.300913	2025-04-02 10:23:11.300913	2026-03-26 10:23:11.080754
3404	JD0100126	James Doyle	JD	4242	proposed	3	Model 2200	\N	\N	2026-01-01 10:23:11.309347	2026-03-26 10:23:11.080754
3405	SM0080226	Sarah Mitchell	SM	4243	lost	2	Model 2400	\N	\N	2026-02-12 10:23:11.312862	2026-03-26 10:23:11.080754
3406	SM0091225	Sarah Mitchell	SM	4244	complete	3	Elevation A	\N	2025-12-16 10:23:11.317356	2025-12-04 10:23:11.317356	2026-03-26 10:23:11.080754
3407	PR0090525	Patrick Reeves	PR	4245	complete	1	The Richmond	\N	2025-06-02 10:23:11.322355	2025-05-08 10:23:11.322355	2026-03-26 10:23:11.080754
3408	JD0111025	James Doyle	JD	4246	contracted	1	Elevation A	\N	2025-11-05 10:23:11.327885	2025-10-12 10:23:11.327885	2026-03-26 10:23:11.080754
3409	SM0101025	Sarah Mitchell	SM	4247	proposed	3	The Princeton	\N	\N	2025-10-28 10:23:11.333438	2026-03-26 10:23:11.080754
3410	SM0110725	Sarah Mitchell	SM	4248	complete	1	Model 3600	\N	2025-08-07 10:23:11.339253	2025-07-26 10:23:11.339253	2026-03-26 10:23:11.080754
3411	PR0100525	Patrick Reeves	PR	4249	contracted	2	The Tidewater	\N	2025-05-31 10:23:11.342864	2025-05-16 10:23:11.342864	2026-03-26 10:23:11.080754
3412	JD0121125	James Doyle	JD	4250	draft	1	Model 3200	\N	\N	2025-11-18 10:23:11.351495	2026-03-26 10:23:11.080754
3413	PR0110625	Patrick Reeves	PR	4251	contracted	3	The Kingston	\N	2025-06-19 10:23:11.363496	2025-06-03 10:23:11.363496	2026-03-26 10:23:11.080754
3414	SM0120625	Sarah Mitchell	SM	4252	draft	3	Elevation D	\N	\N	2025-06-18 10:23:11.368897	2026-03-26 10:23:11.080754
3415	JD0130425	James Doyle	JD	4253	complete	3	Elevation D	\N	2025-04-08 10:23:11.377141	2025-04-02 10:23:11.377141	2026-03-26 10:23:11.080754
3416	PR0121225	Patrick Reeves	PR	4254	proposed	3	Model 2400	\N	\N	2025-12-13 10:23:11.382363	2026-03-26 10:23:11.080754
3417	AC0131125	Austin Cantrell	AC	4255	lost	3	The Kingston	\N	\N	2025-11-24 10:23:11.385291	2026-03-26 10:23:11.080754
3418	SM0131025	Sarah Mitchell	SM	4256	proposed	1	Elevation B	\N	\N	2025-10-12 10:23:11.387483	2026-03-26 10:23:11.080754
3419	AC0141125	Austin Cantrell	AC	4257	proposed	3	The Saratoga	\N	\N	2025-11-19 10:23:11.392724	2026-03-26 10:23:11.080754
3420	SM0140126	Sarah Mitchell	SM	4258	draft	3	The Ashford	\N	\N	2026-01-07 10:23:11.396333	2026-03-26 10:23:11.080754
3421	AC0150525	Austin Cantrell	AC	4259	draft	2	The Montrose	\N	\N	2025-05-09 10:23:11.405853	2026-03-26 10:23:11.080754
3422	PR0130226	Patrick Reeves	PR	4260	complete	3	The Essex	\N	2026-03-21 10:23:11.412427	2026-02-19 10:23:11.412427	2026-03-26 10:23:11.080754
3423	PR0140326	Patrick Reeves	PR	4261	complete	3	The Kingston	\N	2026-03-30 10:23:11.417509	2026-03-03 10:23:11.417509	2026-03-26 10:23:11.080754
3424	JD0140925	James Doyle	JD	4262	draft	2	The Oxford	\N	\N	2025-09-19 10:23:11.420105	2026-03-26 10:23:11.080754
3425	SM0150725	Sarah Mitchell	SM	4263	contracted	1	Elevation B	\N	2025-08-05 10:23:11.426966	2025-07-18 10:23:11.426966	2026-03-26 10:23:11.080754
3426	SM0160225	Sarah Mitchell	SM	4264	complete	3	The Jefferson	\N	2025-03-17 10:23:11.433645	2025-02-26 10:23:11.433645	2026-03-26 10:23:11.080754
3427	PR0151125	Patrick Reeves	PR	4265	complete	2	Elevation D	\N	2025-11-10 10:23:11.438714	2025-11-05 10:23:11.438714	2026-03-26 10:23:11.080754
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, code, name, builder_id, county_id, active) FROM stdin;
4206	OAKHL001	The Reserve at Oak Hill	2831	\N	t
4207	BRMBL001	Brambleton Commons	2832	\N	t
4208	STRGE001	Stone Ridge Estates	2833	\N	t
4209	LAKEV001	Lakeview Crossing	2834	\N	t
4210	RIVRD001	Riverton Glen	2835	\N	t
4211	MAPLL001	Maple Leaf Landing	2836	\N	t
4212	SUMMT001	Summit Pointe	2837	\N	t
4213	CEDAR001	Cedar Creek Villas	2838	\N	t
4214	NEXTS001	Nextshire Commons	2839	\N	t
4215	PINES001	The Pines at Eastwood	2840	\N	t
4216	GREWD001	Greenwood Preserve	2841	\N	t
4217	BELMT001	Belmont Station	2842	\N	t
4218	SUNSET001	Sunset Ridge	2843	\N	t
4219	WILBR001	Wildberry Run	2844	\N	t
4220	MERDN001	Meridian Crossing	2845	\N	t
4221	CHSNT001	Chestnut Hill Farms	2846	\N	t
4222	COLNY001	Colony Park	2847	\N	t
4223	LEGCY001	Legacy Pointe	2848	\N	t
4224	PRMVW001	Primus View Estates	2849	\N	t
4225	SMTVW001	Summit View Townhomes	2850	\N	t
4226	VICTRY001	Victory Ridge	2851	\N	t
4227	COVES001	The Coves at Chesapeake	2852	\N	t
4228	STBRG001	Stonebridge at Lansdowne	2853	\N	t
4229	FOXHL001	Foxhall Village	2854	\N	t
4230	ANTHM001	Anthem at Cascades	2855	\N	t
4231	CLRDG001	Claridge Estates	2856	\N	t
4232	HERTL001	Heartland Village	2857	\N	t
4233	CRSMN001	Crestmont on the Lake	2858	\N	t
4234	ASCNT001	Ascent at Dulles	2859	\N	t
4235	KYSTS001	Keystone at Millwood	2860	\N	t
4236	HMCFT001	HomeCraft at Falls Run	2861	\N	t
4237	NOVUS001	Novus at Laurel Lakes	2862	\N	t
4238	PNCLE001	Pinnacle at Rosslyn	2863	\N	t
4239	OAKMT001	Oakmont Commons	2864	\N	t
4240	CNCRD001	Concord Ridge	2865	\N	t
4241	MADSN001	Madison Place	2866	\N	t
4242	HORZN001	Horizon Shores	2867	\N	t
4243	LNDMK001	Landmark at Stone Port	2868	\N	t
4244	BARRN001	Barrington Estates	2869	\N	t
4245	COLON001	Colonial at Hanover	2870	\N	t
4246	WLLWC001	Willow Creek Crossing	2871	\N	t
4247	EMRLD001	Emerald Cove	2872	\N	t
4248	BLSTN001	Bluestone at the Kanawha	2873	\N	t
4249	TRIDT001	Trident Landing	2874	\N	t
4250	NORWD001	Norwood Park	2875	\N	t
4251	CROSS001	The Crossings at Loudoun	2876	\N	t
4252	HRBVW001	Harbor View at Shore Drive	2877	\N	t
4253	ALPIN001	Alpine Ridge at Huckleberry	2878	\N	t
4254	CPRWD001	Copperwood Villas	2879	\N	t
4255	PRWCK001	Prestwick at Wyndham	2880	\N	t
4256	ASPNC001	Aspen Chase	2881	\N	t
4257	CRDNL001	Cardinal Crossing	2882	\N	t
4258	IRNWD001	Ironwood at Fairways	2883	\N	t
4259	SDBRK001	Saddlebrook Estates	2884	\N	t
4260	GNSS001	Genesis at Liberty Park	2885	\N	t
4261	FXCFT001	Foxcroft Commons	2886	\N	t
4262	WSTLD001	Westland Preserve	2887	\N	t
4263	CNVA001	Canova at Shady Grove	2888	\N	t
4264	SMTVW002	Summit View at Coyner Springs	2889	\N	t
4265	LGRD001	Legacy Ridge at Wyndham	2890	\N	t
4266	OAKHL002	Oak Hill Reserve Phase II	2831	\N	t
\.


--
-- Data for Name: suggestions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suggestions (id, submitted_at, user_id, user_name, type, subject, message, status) FROM stdin;
1	2026-03-28 11:52:00.944982	1	Administrator	bug	Shit's whack	Man idk what it is this shit kinda whack	new
\.


--
-- Data for Name: systems; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.systems (id, house_type_id, system_number, zone_label, equipment_system_id, notes) FROM stdin;
287	3458	01	Zone 1	\N	\N
158	3377	01	Upper Floor	\N	\N
159	3377	02	Finished Basement	\N	\N
160	3378	01	First Floor	\N	\N
161	3378	02	Second Floor	\N	\N
162	3379	01	Main Floor	\N	\N
163	3379	02	Upper Floor	\N	\N
164	3380	01	Finished Basement	\N	\N
165	3381	01	First Floor	\N	\N
166	3381	02	Main Floor	\N	\N
167	3382	01	Upper Floor	\N	\N
168	3382	02	Upper Floor	\N	\N
169	3383	01	Bonus Room	\N	\N
170	3384	01	Basement	\N	\N
171	3385	01	Third Floor	\N	\N
172	3386	01	Bonus Room	\N	\N
173	3386	02	Second Floor	\N	\N
174	3387	01	Upper Floor	\N	\N
175	3387	02	Finished Basement	\N	\N
176	3388	01	Main Floor	\N	\N
177	3388	02	First Floor	\N	\N
178	3389	01	Upper Floor	\N	\N
179	3389	02	Bonus Room	\N	\N
180	3390	01	First Floor	\N	\N
181	3390	02	Third Floor	\N	\N
182	3391	01	First Floor	\N	\N
183	3391	02	Basement	\N	\N
184	3392	01	First Floor	\N	\N
185	3392	02	Bonus Room	\N	\N
186	3393	01	Bonus Room	\N	\N
187	3393	02	Bonus Room	\N	\N
188	3394	01	Finished Basement	\N	\N
189	3394	02	First Floor	\N	\N
190	3395	01	Finished Basement	\N	\N
191	3396	01	Finished Basement	\N	\N
192	3396	02	Main Floor	\N	\N
193	3397	01	Main Floor	\N	\N
194	3398	01	Main Floor	\N	\N
195	3399	01	First Floor	\N	\N
196	3400	01	Second Floor	\N	\N
197	3401	01	First Floor	\N	\N
198	3401	02	Main Floor	\N	\N
199	3402	01	Main Floor	\N	\N
200	3402	02	Second Floor	\N	\N
201	3403	01	Main Floor	\N	\N
202	3403	02	Main Floor	\N	\N
203	3404	01	Basement	\N	\N
204	3404	02	Third Floor	\N	\N
205	3405	01	Basement	\N	\N
206	3406	01	Bonus Room	\N	\N
207	3406	02	First Floor	\N	\N
208	3407	01	First Floor	\N	\N
209	3407	02	Finished Basement	\N	\N
210	3408	01	First Floor	\N	\N
211	3408	02	Upper Floor	\N	\N
212	3409	01	Finished Basement	\N	\N
213	3409	02	Third Floor	\N	\N
214	3410	01	Finished Basement	\N	\N
215	3410	02	Bonus Room	\N	\N
216	3411	01	Basement	\N	\N
217	3411	02	Finished Basement	\N	\N
218	3412	01	Bonus Room	\N	\N
219	3412	02	Bonus Room	\N	\N
220	3413	01	Finished Basement	\N	\N
221	3413	02	First Floor	\N	\N
222	3414	01	Upper Floor	\N	\N
223	3414	02	Finished Basement	\N	\N
224	3415	01	Third Floor	\N	\N
225	3415	02	Basement	\N	\N
226	3416	01	Basement	\N	\N
227	3416	02	Bonus Room	\N	\N
228	3417	01	Third Floor	\N	\N
229	3418	01	Finished Basement	\N	\N
230	3419	01	Upper Floor	\N	\N
231	3419	02	Bonus Room	\N	\N
232	3420	01	Second Floor	\N	\N
233	3420	02	First Floor	\N	\N
234	3421	01	Bonus Room	\N	\N
235	3422	01	Main Floor	\N	\N
236	3422	02	Third Floor	\N	\N
237	3423	01	Third Floor	\N	\N
238	3424	01	Main Floor	\N	\N
239	3425	01	First Floor	\N	\N
240	3425	02	Second Floor	\N	\N
241	3426	01	Bonus Room	\N	\N
242	3426	02	Basement	\N	\N
243	3427	01	Basement	\N	\N
244	3428	01	Basement	\N	\N
245	3429	01	First Floor	\N	\N
246	3430	01	Third Floor	\N	\N
247	3431	01	Second Floor	\N	\N
248	3431	02	First Floor	\N	\N
249	3432	01	Third Floor	\N	\N
250	3433	01	First Floor	\N	\N
251	3433	02	Main Floor	\N	\N
252	3434	01	Second Floor	\N	\N
253	3434	02	First Floor	\N	\N
254	3435	01	Upper Floor	\N	\N
255	3436	01	Third Floor	\N	\N
256	3436	02	Upper Floor	\N	\N
257	3437	01	Basement	\N	\N
258	3438	01	Second Floor	\N	\N
259	3439	01	Second Floor	\N	\N
260	3439	02	Finished Basement	\N	\N
261	3440	01	Third Floor	\N	\N
262	3440	02	First Floor	\N	\N
263	3441	01	Basement	\N	\N
264	3441	02	Finished Basement	\N	\N
265	3442	01	Main Floor	\N	\N
266	3443	01	Upper Floor	\N	\N
267	3444	01	Finished Basement	\N	\N
268	3445	01	Basement	\N	\N
269	3446	01	First Floor	\N	\N
270	3446	02	Main Floor	\N	\N
271	3447	01	Bonus Room	\N	\N
272	3448	01	Basement	\N	\N
273	3448	02	Third Floor	\N	\N
274	3449	01	Upper Floor	\N	\N
275	3450	01	Main Floor	\N	\N
276	3450	02	Third Floor	\N	\N
277	3451	01	Bonus Room	\N	\N
278	3452	01	Upper Floor	\N	\N
279	3453	01	Second Floor	\N	\N
280	3453	02	First Floor	\N	\N
281	3454	01	Bonus Room	\N	\N
282	3455	01	Basement	\N	\N
283	3456	01	Finished Basement	\N	\N
284	3456	02	Main Floor	\N	\N
285	3457	01	Third Floor	\N	\N
286	3457	02	Upper Floor	\N	\N
146	3369	01	Finished Basement	\N	\N
147	3370	01	Basement	\N	\N
148	3371	01	First Floor	\N	\N
149	3371	02	Bonus Room	\N	\N
150	3372	01	Basement	\N	\N
151	3372	02	Second Floor	\N	\N
152	3373	01	Main Floor	\N	\N
153	3374	01	Basement	\N	\N
154	3375	01	Bonus Room	\N	\N
155	3375	02	Finished Basement	\N	\N
156	3376	01	First Floor	\N	\N
157	3376	02	Bonus Room	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, full_name, initials, email, hashed_password, role, active, created_at, updated_at) FROM stdin;
10	manager	Office Manager	OM	manager@metcalfe.com	$2b$12$7Ihm/0veHPz.o3YACJsFJ.mgpXzrRrF/XoLSRM3bkQ8Hzxf4jwhP2	account_manager	f	2026-03-23 13:11:21.206831	2026-03-26 13:49:13.229329
11	acantrell	Austin Cantrell	AC	austin@metcalfe.com	$2b$12$PheEoGM/Kgc7Q1JtxO1K9.moeac7JTzZ2qwUjFfmQPhIfycPAIpWi	account_manager	t	2026-03-23 21:40:36.954402	2026-03-27 00:03:35.253837
8	jholsinger	John Kline	JK	jkline@whmetcalfe.com	$2b$12$OTjsbry9EVS2vwSN2m2a9O.hHju2f2t/ONEcnlHxXHWEOTdVgTr/y	account_manager	t	2026-03-23 13:11:21.206831	2026-03-28 03:16:52.300957
3	celam	Carson Elam	CE	celam@metcalfe.com	$2b$12$ZfrLy0m33QEcV8VGz5WFfurx7U09zXlOcAvOPNIa/GSiBS6eWNhsi	account_manager	f	2026-03-23 13:11:21.206831	2026-03-23 13:11:57.116187
9	lwhittemore	Lisa Whittemore	LW	lwhittemore@metcalfe.com	$2b$12$ihtoIy2xBx5VuVZPPOrTqOCTgWSraRUF5lpOU2wZ1jdBjqCSOKu0a	account_manager	f	2026-03-23 13:11:21.206831	2026-03-23 13:19:06.256351
2	bhackett	Bill Hackett	BH	bhackett@metcalfe.com	$2b$12$c5QoIsI8OfNrW4nr0KkHmek4nD7HjI0KdXu6o4s5x3Rx47TJixfWm	account_manager	f	2026-03-23 13:11:21.206831	2026-03-23 13:19:08.666471
6	ganderson	Gary Anderson	GA	ganderson@metcalfe.com	$2b$12$TWchgEEfCKuhpydPhHo/fu2oD4BG.1mR3aG6FhEx5cSCs5GELXGsS	account_manager	f	2026-03-23 13:11:21.206831	2026-03-23 13:19:10.959873
1	admin	Administrator	AD	acantrell@whmetcalfe.com	$2b$12$QHKA09uMPTKqlGdVBFpLMOMHVub/QGKps5E4nTwfKYEcFI6xX4oBG	admin	t	2026-03-23 11:58:57.161466	2026-03-26 09:42:52.998578
12	dknupp	Dave Knupp	DK	dknupp@whmetcalfe.com	$2b$12$J8hw8DUCTcKMKJv4SzErF.SLHOVc4JaKvdSftaJleYBxCPo7828kW	account_executive	t	2026-03-26 13:48:00.924818	2026-03-26 13:48:00.924818
4	cstandridge	Cliff Standridge	CS	cstandridge@whmetcalfe.com	$2b$12$r/3pfn1oQ90enwB3dZ7.nekaWL9tOjasJkASeX5SiqHyawRamtrk.	account_executive	t	2026-03-23 13:11:21.206831	2026-03-26 13:48:32.369803
5	dabelende	Derek Abelende	DA	dabelende@whmetcalfe.com	$2b$12$mYfu47RUz0BCT.FLhMUOdeGc7n7FnimIAuzwdUQ6Jogn7wtQ6Dhya	account_executive	t	2026-03-23 13:11:21.206831	2026-03-26 13:48:55.071051
7	jflewellyn	Jamie Flewellyn	JF	jflewellyn@whmetcalfe.com	$2b$12$b7fF7bAF02VB2FtvMH3WM.FFeUsoxu9td1D7sdmSHv..dLEy2Zmi.	account_manager	t	2026-03-23 13:11:21.206831	2026-03-26 13:49:05.80403
\.


--
-- Name: builders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.builders_id_seq', 2890, true);


--
-- Name: counties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.counties_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 25, true);


--
-- Name: draws_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.draws_id_seq', 462, true);


--
-- Name: equipment_components_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipment_components_id_seq', 3809, true);


--
-- Name: equipment_manufacturers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipment_manufacturers_id_seq', 30, true);


--
-- Name: equipment_systems_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipment_systems_id_seq', 4072, true);


--
-- Name: event_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_log_id_seq', 165, true);


--
-- Name: house_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.house_types_id_seq', 3458, true);


--
-- Name: kit_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.kit_items_id_seq', 14, true);


--
-- Name: line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.line_items_id_seq', 3104, true);


--
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plans_id_seq', 3428, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 4266, true);


--
-- Name: suggestions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suggestions_id_seq', 1, true);


--
-- Name: systems_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.systems_id_seq', 287, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: builders builders_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builders
    ADD CONSTRAINT builders_code_key UNIQUE (code);


--
-- Name: builders builders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builders
    ADD CONSTRAINT builders_pkey PRIMARY KEY (id);


--
-- Name: counties counties_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counties
    ADD CONSTRAINT counties_code_key UNIQUE (code);


--
-- Name: counties counties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counties
    ADD CONSTRAINT counties_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: draws draws_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.draws
    ADD CONSTRAINT draws_pkey PRIMARY KEY (id);


--
-- Name: equipment_components equipment_components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_components
    ADD CONSTRAINT equipment_components_pkey PRIMARY KEY (id);


--
-- Name: equipment_manufacturers equipment_manufacturers_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_manufacturers
    ADD CONSTRAINT equipment_manufacturers_code_key UNIQUE (code);


--
-- Name: equipment_manufacturers equipment_manufacturers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_manufacturers
    ADD CONSTRAINT equipment_manufacturers_pkey PRIMARY KEY (id);


--
-- Name: equipment_systems equipment_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_systems
    ADD CONSTRAINT equipment_systems_pkey PRIMARY KEY (id);


--
-- Name: event_log event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_log
    ADD CONSTRAINT event_log_pkey PRIMARY KEY (id);


--
-- Name: house_types house_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.house_types
    ADD CONSTRAINT house_types_pkey PRIMARY KEY (id);


--
-- Name: kit_items kit_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kit_items
    ADD CONSTRAINT kit_items_pkey PRIMARY KEY (id);


--
-- Name: line_items line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT line_items_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: plans plans_plan_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_plan_number_key UNIQUE (plan_number);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: suggestions suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suggestions
    ADD CONSTRAINT suggestions_pkey PRIMARY KEY (id);


--
-- Name: systems systems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.systems
    ADD CONSTRAINT systems_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_initials_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_initials_unique UNIQUE (initials);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: ix_documents_doc_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_doc_type ON public.documents USING btree (doc_type);


--
-- Name: ix_documents_plan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_plan_id ON public.documents USING btree (plan_id);


--
-- Name: ix_equipment_components_system_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_components_system_id ON public.equipment_components USING btree (system_id);


--
-- Name: ix_equipment_systems_mfr; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_systems_mfr ON public.equipment_systems USING btree (manufacturer_id);


--
-- Name: ix_equipment_systems_retired; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_systems_retired ON public.equipment_systems USING btree (retired_date);


--
-- Name: ix_plans_contracted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_plans_contracted_at ON public.plans USING btree (contracted_at);


--
-- Name: ix_plans_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_plans_created_at ON public.plans USING btree (created_at);


--
-- Name: ix_plans_estimator_initials; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_plans_estimator_initials ON public.plans USING btree (estimator_initials);


--
-- Name: ix_plans_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_plans_project_id ON public.plans USING btree (project_id);


--
-- Name: ix_plans_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_plans_status ON public.plans USING btree (status);


--
-- Name: ix_suggestions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_suggestions_status ON public.suggestions USING btree (status);


--
-- Name: ix_suggestions_submitted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_suggestions_submitted_at ON public.suggestions USING btree (submitted_at);


--
-- Name: documents documents_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: draws draws_house_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.draws
    ADD CONSTRAINT draws_house_type_id_fkey FOREIGN KEY (house_type_id) REFERENCES public.house_types(id);


--
-- Name: equipment_components equipment_components_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_components
    ADD CONSTRAINT equipment_components_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.equipment_systems(id);


--
-- Name: equipment_systems equipment_systems_manufacturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_systems
    ADD CONSTRAINT equipment_systems_manufacturer_id_fkey FOREIGN KEY (manufacturer_id) REFERENCES public.equipment_manufacturers(id);


--
-- Name: event_log event_log_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_log
    ADD CONSTRAINT event_log_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: house_types house_types_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.house_types
    ADD CONSTRAINT house_types_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: line_items line_items_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT line_items_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems(id);


--
-- Name: plans plans_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: projects projects_builder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_builder_id_fkey FOREIGN KEY (builder_id) REFERENCES public.builders(id);


--
-- Name: projects projects_county_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_county_id_fkey FOREIGN KEY (county_id) REFERENCES public.counties(id);


--
-- Name: suggestions suggestions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suggestions
    ADD CONSTRAINT suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: systems systems_equipment_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.systems
    ADD CONSTRAINT systems_equipment_system_id_fkey FOREIGN KEY (equipment_system_id) REFERENCES public.equipment_systems(id);


--
-- Name: systems systems_house_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.systems
    ADD CONSTRAINT systems_house_type_id_fkey FOREIGN KEY (house_type_id) REFERENCES public.house_types(id);


--
-- PostgreSQL database dump complete
--

\unrestrict wUCONIhV5HzxHuVPwj75APM1mbJdS1WkFAezQZaLJSqmTC2XL3PUei9Bdr0KuQ3

