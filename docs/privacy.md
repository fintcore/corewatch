# Privacy and data scrubbing

CoreWatch is built so that credentials and personal data do not reach your transports by accident.

## What is scrubbed

Before an event is sent, the values of sensitive keys in `user`, `extra`, `tags` and `breadcrumbs` (including breadcrumb `data` and the Redux state) are replaced with `"[Filtered]"`.

A key is sensitive when its lower-cased name **contains** any entry of the deny list:

```
password, passwd, pwd, secret, token, access_token, refresh_token, authorization,
auth, apikey, api_key, session, cookie, card, cardnumber, cvv, cvc, ssn,
curp, rfc, clabe, email, phone, creditcard
```

`curp`, `rfc` and `clabe` cover Mexican personal, tax and bank identifiers.

Scrubbing also:

- cuts circular references (`"[Circular]"`) and nesting deeper than 6 levels (`"[MaxDepth]"`);
- keeps at most 100 items per array;
- never mutates your objects (it works on a copy).

## What is not scrubbed

- `event.message` and `event.exception` (error type, message and stack). Avoid putting personal data in error messages.
- `event.context`: page URL, referrer, user agent, viewport and language. Query strings in URLs are sent as is.
- Values under keys that do not match the deny list, for example `user.username`.

Use `beforeSend` for anything specific to your app:

```js
init({
  beforeSend(event) {
    if (event.context?.url) event.context.url = event.context.url.split('?')[0]; // drop query strings
    if (event.message) event.message = event.message.replace(/\b\d{16}\b/g, '[card]');
    return event;
  },
});
```

## Customizing the deny list

```js
import { init, DEFAULT_DENY_KEYS } from '@dynamicore/corewatch';

init({ denyKeys: [...DEFAULT_DENY_KEYS, 'nss', 'birthdate'] });
```

Matching is by substring, so it can over-match: `auth` also masks `author`, and `session` masks `sessionCount`. Rename those keys or remove the entry if that matters for you.

To turn scrubbing off completely (not recommended), set `sanitize: false`.

## Identifying users

Send a stable, non-personal identifier when you can:

```js
setUser({ id: user.id, role: user.role }); // good
setUser({ id: user.id, email: user.email }); // email is scrubbed anyway
```
