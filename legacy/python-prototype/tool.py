"""Bounded offline review utility. Exit 0 means completed report, never safety."""
import argparse
import json
import math
import sys
from datetime import date, datetime
from pathlib import Path

def strings(value):
    if not isinstance(value,list) or any(not isinstance(x,str) or not x for x in value):
        raise ValueError('expected list of nonempty strings')
    return value

def records(value):
    if not isinstance(value,list) or any(not isinstance(x,dict) for x in value):
        raise ValueError('expected list of objects')
    return value

def text(value):
    if not isinstance(value,str) or not value:
        raise ValueError('expected nonempty text')
    return value

def integer(value):
    if type(value) is not int or value<0:
        raise ValueError('expected nonnegative integer')
    return value

def boolean(value):
    if type(value) is not bool:
        raise ValueError('expected boolean')
    return value

def unique_ids(rows):
    ids=[text(r['id']) for r in rows]
    if len(ids)!=len(set(ids)):
        raise ValueError('duplicate IDs')

def utc(value):
    text(value)
    if not value.endswith('Z') or 'T' not in value:
        raise ValueError('UTC ISO timestamp required')
    return datetime.fromisoformat(value.replace('Z','+00:00'))

def analyze(d):
    nodes=set(strings(d['nodes'])); changed=set(strings(d['changed'])); edges=d['edges']; tests=d['tests']
    if not isinstance(edges,list) or not isinstance(tests,dict): raise ValueError('edges/tests malformed')
    parents={}; unresolved=set(changed-nodes)
    for edge in edges:
        strings(edge)
        if len(edge)!=2: raise ValueError('edge needs consumer and dependency')
        consumer,dependency=edge
        unresolved.update(set(edge)-nodes)
        if consumer in nodes and dependency in nodes: parents.setdefault(dependency,set()).add(consumer)
    impacted=changed & nodes; todo=list(impacted)
    while todo:
        for consumer in sorted(parents.get(todo.pop(),set())):
            if consumer not in impacted: impacted.add(consumer); todo.append(consumer)
    selected=[]; mapped=set()
    for name,dependencies in sorted(tests.items()):
        text(name); dependencies=set(strings(dependencies)); unresolved.update(dependencies-nodes)
        mapped.update(dependencies & nodes)
        if dependencies & impacted: selected.append(name)
    # A test mapped to a consumer also covers its declared dependencies.
    dependencies_by_consumer={}
    for consumer,dependency in edges:
        if consumer in nodes and dependency in nodes:
            dependencies_by_consumer.setdefault(consumer,set()).add(dependency)
    covered=set(mapped); todo=list(mapped)
    while todo:
        for dependency in dependencies_by_consumer.get(todo.pop(),set()):
            if dependency not in covered: covered.add(dependency); todo.append(dependency)
    unmapped=sorted(impacted-covered); reasons=[]
    if not tests: reasons.append('empty_test_universe')
    if unresolved: reasons.append('unresolved_references')
    if unmapped: reasons.append('unmapped_impacted')
    if reasons: selected=sorted(tests)
    return {'decision':'unknown' if reasons else 'complete','potentially_impacted':sorted(impacted),'selected_tests':selected,'unresolved':sorted(unresolved),'behavior':'unverified','fallback_reasons':reasons,'unmapped_impacted':unmapped}

def bounded(value, depth=0):
    if depth > 32:
        raise ValueError('nesting exceeds 32')
    if isinstance(value, (list, dict)):
        if len(value) > 1000:
            raise ValueError('container exceeds 1000 entries')
        for child in value.values() if isinstance(value, dict) else value:
            bounded(child, depth + 1)
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError('nonfinite number')


def load(path):
    # Bound bytes read even if a file grows between stat and read.
    with path.open('rb') as stream:
        raw = stream.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError('input exceeds 2MB')
    def pairs(items):
        out = {}
        for key, value in items:
            if key in out:
                raise ValueError('duplicate JSON key')
            out[key] = value
        return out
    value = json.loads(raw, object_pairs_hook=pairs,
                       parse_constant=lambda value: (_ for _ in ()).throw(ValueError('nonfinite JSON')))
    bounded(value)
    if not isinstance(value, dict):
        raise ValueError('input must be object')
    return value


def main(argv=None):
    parser=argparse.ArgumentParser(); parser.add_argument('--input',type=Path,required=True); parser.add_argument('--output',type=Path,required=True); args=parser.parse_args(argv)
    try:
        if args.input.resolve() == args.output.resolve() or (args.output.exists() and args.input.samefile(args.output)):
            raise ValueError('output must not overwrite input')
        raw=load(args.input)
        result=analyze(raw)
        args.output.write_text(json.dumps(result,indent=2,sort_keys=True,allow_nan=False)+'\n')
        return 1 if result['decision']=='failure' else 0
    except (ValueError,TypeError,KeyError,AttributeError,OSError,OverflowError,RecursionError) as exc:
        print(json.dumps({'error':str(exc),'decision':'malformed'}),file=sys.stderr); return 2

if __name__=='__main__': raise SystemExit(main())
