create table public."User" (
    id uuid not null primary key,
    email text not null unique,
    password text not null,
    created_at timestamp with time zone default now() not null
);
