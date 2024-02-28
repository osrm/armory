# Policy Engine

TBD

## Requirements

- [Open Policy Agent (OPA)
  binary](https://www.openpolicyagent.org/docs/latest/#1-download-opa) installed
  and accessible in your `$PATH`.

## Getting started

```bash
make policy-engine/setup
```

## Running

```bash
make policy-engine/start/dev
```

## Testing

```bash
make policy-engine/test/type
make policy-engine/test/unit
make policy-engine/test/integration
make policy-engine/test/e2e
```

## Formatting

```bash
make policy-engine/format
make policy-engine/lint

make policy-engine/format/check
make policy-engine/lint/check
```