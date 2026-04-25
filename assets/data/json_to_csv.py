import json
import csv
import os
import re

BASE_DIR = r"C:\Users\kauan\OneDrive\Área de Trabalho\portal-inscricoes\assets\data"

def inferir_tipo(telefone):
    if re.search(r'\(\d{2}\)\s*9', telefone):
        return "whatsapp"
    return "telefone"

def sanitize_value(value):
    if value is None:
        return ""
    return str(value)

print("[1] Gerando setores_contatos.csv...")

setores_rows = []
setores_fields = ['setor', 'telefone', 'tipo', 'email']

# Ler contatos_setores.json
with open(os.path.join(BASE_DIR, 'contatos_setores.json'), encoding='utf-8') as f:
    contatos = json.load(f)

for item in contatos:
    setor = sanitize_value(item.get('setor', ''))
    email = sanitize_value(item.get('email', ''))
    
    if 'telefone' in item and isinstance(item.get('telefone'), str):
        tel = item['telefone']
        tipo = item.get('tipo') or inferir_tipo(tel)
        setores_rows.append({'setor': setor, 'telefone': tel, 'tipo': tipo, 'email': email})
    
    elif 'telefones' in item and isinstance(item.get('telefones'), list):
        for tel in item['telefones']:
            tipo = item.get('tipo') or inferir_tipo(tel)
            setores_rows.append({'setor': setor, 'telefone': tel, 'tipo': tipo, 'email': email})

print(f"   -> {len(setores_rows)} registros de contatos_setores.json")

print("[2] Gerando coordenadores.csv...")

UNIDADE_MAP = {
    'Sede': 'sede',
    'Zona Leste': 'leste',
    'Zona Norte': 'norte',
    'Zona Sul': 'sul'
}

coords_rows = []

with open(os.path.join(BASE_DIR, 'coordenadores.json'), encoding='utf-8') as f:
    coords = json.load(f)

for item in coords:
    if 'unidade' not in item:
        continue
    
    unidade = item['unidade']
    uid = UNIDADE_MAP.get(unidade, unidade.lower().replace(' ', '_').replace('-', '_'))
    
    cursos = ','.join(item.get('cursos', []))
    contato = sanitize_value(item.get('contato', ''))
    email = sanitize_value(item.get('email', ''))
    
    coords_rows.append({
        'unidade_id': uid,
        'coordenador': sanitize_value(item.get('coordenador', '')),
        'cursos': cursos,
        'contato': contato,
        'email': email
    })

with open(os.path.join(BASE_DIR, 'coordenadores.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=['unidade_id', 'coordenador', 'cursos', 'contato', 'email'])
    writer.writeheader()
    writer.writerows(coords_rows)

print(f"   -> {len(coords_rows)} registros")

print("\n[3] Misturar registros inválidos de coordenadores.json para setores_contatos.csv...")

# Segunda passagem: pegar registros sem 'unidade' (que têm 'setor')
for item in coords:
    if 'unidade' not in item and 'setor' in item:
        setor = sanitize_value(item.get('setor', ''))
        email = sanitize_value(item.get('email', ''))
        
        if 'telefone' in item and isinstance(item.get('telefone'), str):
            tel = item['telefone']
            tipo = item.get('tipo') or inferir_tipo(tel)
            setores_rows.append({'setor': setor, 'telefone': tel, 'tipo': tipo, 'email': email})
        
        elif 'telefones' in item and isinstance(item.get('telefones'), list):
            for tel in item['telefones']:
                tipo = item.get('tipo') or inferir_tipo(tel)
                setores_rows.append({'setor': setor, 'telefone': tel, 'tipo': tipo, 'email': email})

# Sobrescrever setores_contatos.csv com todos os registros
with open(os.path.join(BASE_DIR, 'setores_contatos.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=setores_fields)
    writer.writeheader()
    writer.writerows(setores_rows)

print(f"   -> Total: {len(setores_rows)} registros")

print("\n=== CSV gerados com sucesso ===")
print(f"  - {os.path.join(BASE_DIR, 'setores_contatos.csv')}")
print(f"  - {os.path.join(BASE_DIR, 'coordenadores.csv')}")