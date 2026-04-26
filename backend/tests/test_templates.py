"""Tests for template endpoints."""
import pytest


def test_get_templates_empty(client, auth_headers):
    """Test getting templates when none exist."""
    response = client.get('/api/templates', headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json() == []


def test_create_template_success(client, auth_headers, db_session):
    """Test creating a template."""
    response = client.post('/api/templates', headers=auth_headers, json={
        'name': 'VFR Local',
        'description': 'Local VFR flight',
        'category': 'VFR',
        'fields': ['pic', 'night', 'ldg_day'],
        'calculations': {}
    })
    assert response.status_code == 201
    data = response.get_json()
    assert 'id' in data


def test_create_template_no_name(client, auth_headers):
    """Test creating template without name fails."""
    response = client.post('/api/templates', headers=auth_headers, json={
        'description': 'No name',
        'category': 'VFR'
    })
    assert response.status_code == 400


def test_create_template_from_shared(client, auth_headers, db_session):
    """Test creating template by copying shared template."""
    from models import SharedTemplate

    # Create a shared template first
    shared = SharedTemplate(
        name='IFR Training',
        description='IFR practice',
        category='IFR',
        fields=['ifr', 'actual_imc', 'approaches'],
        calculations={},
        is_active=True
    )
    db_session.add(shared)
    db_session.commit()

    # Copy it
    response = client.post('/api/templates', headers=auth_headers, json={
        'name': 'My IFR Template',
        'shared_template_id': shared.id
    })
    assert response.status_code == 201


def test_create_template_invalid_shared_id(client, auth_headers):
    """Test creating template with invalid shared_template_id fails."""
    response = client.post('/api/templates', headers=auth_headers, json={
        'name': 'Test',
        'shared_template_id': 9999  # Non-existent
    })
    assert response.status_code == 404


def test_update_template(client, auth_headers, db_session):
    """Test updating a template."""
    # Create template first
    response = client.post('/api/templates', headers=auth_headers, json={
        'name': 'Original',
        'description': 'Original desc',
    })
    template_id = response.get_json()['id']

    # Update it
    response = client.put(f'/api/templates/{template_id}', headers=auth_headers, json={
        'name': 'Updated',
        'description': 'Updated desc'
    })
    assert response.status_code == 200


def test_update_template_not_found(client, auth_headers):
    """Test updating non-existent template fails."""
    response = client.put('/api/templates/9999', headers=auth_headers, json={
        'name': 'Updated'
    })
    assert response.status_code == 404


def test_delete_template(client, auth_headers, db_session):
    """Test deleting a template."""
    # Create template first
    response = client.post('/api/templates', headers=auth_headers, json={
        'name': 'To Delete'
    })
    template_id = response.get_json()['id']

    # Delete it
    response = client.delete(f'/api/templates/{template_id}', headers=auth_headers)
    assert response.status_code == 200

    # Verify deleted
    response = client.get('/api/templates', headers=auth_headers)
    assert response.get_json() == []


def test_template_validation_invalid_field(client, auth_headers):
    """Test template validation rejects invalid data."""
    response = client.post('/api/templates', headers=auth_headers, json={
        'name': '',  # Empty name should fail validation
    })
    assert response.status_code == 400
