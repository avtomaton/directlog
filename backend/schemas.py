"""Marshmallow schemas for validating API input."""
from marshmallow import Schema, fields as ma_fields, validate, pre_load
from datetime import datetime


class FlightSchema(Schema):
    """Schema for validating flight creation/update."""
    date = ma_fields.Date(required=True, format='%Y-%m-%d')
    aircraft = ma_fields.String(required=True, validate=validate.Length(min=1, max=20))
    from_ = ma_fields.String(validate=validate.Length(max=4), data_key='from')
    to = ma_fields.String(validate=validate.Length(max=4))
    air_time = ma_fields.Float(validate=validate.Range(min=0))
    pic = ma_fields.Float(validate=validate.Range(min=0))
    sic = ma_fields.Float(validate=validate.Range(min=0))
    dual = ma_fields.Float(validate=validate.Range(min=0))
    night = ma_fields.Float(validate=validate.Range(min=0))
    ifr = ma_fields.Float(validate=validate.Range(min=0))
    actual_imc = ma_fields.Float(validate=validate.Range(min=0))
    simulated = ma_fields.Float(validate=validate.Range(min=0))
    xc = ma_fields.Float(validate=validate.Range(min=0))
    xc_over_50nm = ma_fields.Float(validate=validate.Range(min=0))
    right_seat = ma_fields.Float(validate=validate.Range(min=0))
    multi_pilot = ma_fields.Float(validate=validate.Range(min=0))
    pilot_flying = ma_fields.Float(validate=validate.Range(min=0))
    holds = ma_fields.Integer(validate=validate.Range(min=0))
    multi_engine = ma_fields.Float(validate=validate.Range(min=0))
    complex = ma_fields.Float(validate=validate.Range(min=0))
    high_performance = ma_fields.Float(validate=validate.Range(min=0))
    turbine = ma_fields.Float(validate=validate.Range(min=0))
    jet = ma_fields.Float(validate=validate.Range(min=0))
    medevac = ma_fields.Boolean()
    ems = ma_fields.Boolean()
    search_and_rescue = ma_fields.Boolean()
    aerial_work = ma_fields.Boolean()
    training = ma_fields.Boolean()
    checkride = ma_fields.Boolean()
    flight_review = ma_fields.Boolean()
    ipc = ma_fields.Boolean()
    ppc = ma_fields.Boolean()
    ldg_day = ma_fields.Integer(validate=validate.Range(min=0))
    ldg_night = ma_fields.Integer(validate=validate.Range(min=0))
    route = ma_fields.String(validate=validate.Length(max=500))
    pic_name = ma_fields.String(validate=validate.Length(max=255))
    sic_name = ma_fields.String(validate=validate.Length(max=255))
    approaches = ma_fields.List(ma_fields.Dict())
    start_time = ma_fields.String(validate=validate.Regexp(r'^\d{2}:\d{2}$'))
    takeoff_time = ma_fields.String(validate=validate.Regexp(r'^\d{2}:\d{2}$'))
    landing_time = ma_fields.String(validate=validate.Regexp(r'^\d{2}:\d{2}$'))
    shutdown_time = ma_fields.String(validate=validate.Regexp(r'^\d{2}:\d{2}$'))

    @pre_load
    def uppercase_airports(self, data, **kwargs):
        if data.get('from'):
            data['from'] = data['from'].upper()
        if data.get('to'):
            data['to'] = data['to'].upper()
        return data


class UserAircraftSchema(Schema):
    """Schema for validating aircraft creation/update."""
    reg = ma_fields.String(required=True, validate=validate.Length(min=1, max=20))
    type = ma_fields.String(validate=validate.Length(max=100))
    category = ma_fields.String(validate=validate.Length(max=10))
    total_time = ma_fields.Float(validate=validate.Range(min=0))
    last_flown = ma_fields.String()
    hidden = ma_fields.Boolean()
    notes = ma_fields.String(validate=validate.Length(max=500))
    shared_aircraft_id = ma_fields.Integer()


class TemplateSchema(Schema):
    """Schema for validating template creation/update."""
    name = ma_fields.String(required=True, validate=validate.Length(min=1, max=255))
    description = ma_fields.String(validate=validate.Length(max=500))
    category = ma_fields.String(validate=validate.Length(max=50))
    fields = ma_fields.List(ma_fields.String())  # Use 'fields' to match API input
    calculations = ma_fields.Dict()
    shared_template_id = ma_fields.Integer()


class EventSchema(Schema):
    """Schema for validating currency event creation/update."""
    date = ma_fields.Date(required=True, format='%Y-%m-%d')
    type = ma_fields.String(required=True, validate=validate.OneOf([
        'flight_review', 'ipc', 'ppc', 'seminar', 'self_paced', 'exam'
    ]))
    description = ma_fields.String(validate=validate.Length(max=500))
    instructor = ma_fields.String(validate=validate.Length(max=255))
    expiry = ma_fields.Date(format='%Y-%m-%d')


class SettingsSchema(Schema):
    """Schema for validating settings update."""
    regulation = ma_fields.String(validate=validate.OneOf(['CARs', 'FAA', 'EASA']))
    home_airport = ma_fields.String(validate=validate.Length(max=4))
    currency_view = ma_fields.String(validate=validate.OneOf(['day', 'night', 'both']))
    time_format = ma_fields.String(validate=validate.OneOf(['hours', 'minutes']))


# Schema instances
flight_schema = FlightSchema()
flight_update_schema = FlightSchema(partial=True)
aircraft_schema = UserAircraftSchema()
aircraft_update_schema = UserAircraftSchema(partial=True)
template_schema = TemplateSchema()
template_update_schema = TemplateSchema(partial=True)
event_schema = EventSchema()
event_update_schema = EventSchema(partial=True)
settings_schema = SettingsSchema()
