"""Initial credit risk database schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-30 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Borrowers
    op.create_table(
        'borrowers',
        sa.Column('borrower_id', sa.String(length=50), nullable=False),
        sa.Column('legal_name', sa.String(length=255), nullable=False),
        sa.Column('sector', sa.String(length=100), nullable=False),
        sa.Column('geography', sa.String(length=100), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('credit_rating', sa.String(length=20), nullable=False),
        sa.Column('annual_revenue', sa.Float(), nullable=True),
        sa.Column('total_assets', sa.Float(), nullable=True),
        sa.Column('leverage', sa.Float(), nullable=True),
        sa.Column('debt_ratio', sa.Float(), nullable=True),
        sa.Column('interest_coverage', sa.Float(), nullable=True),
        sa.Column('profitability', sa.Float(), nullable=True),
        sa.Column('liquidity', sa.Float(), nullable=True),
        sa.Column('established_year', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('borrower_id')
    )

    # Loans
    op.create_table(
        'loans',
        sa.Column('loan_id', sa.String(length=50), nullable=False),
        sa.Column('borrower_id', sa.String(length=50), nullable=False),
        sa.Column('facility_type', sa.String(length=50), nullable=False),
        sa.Column('seniority', sa.String(length=50), nullable=False),
        sa.Column('credit_rating', sa.String(length=20), nullable=False),
        sa.Column('sector', sa.String(length=100), nullable=False),
        sa.Column('geography', sa.String(length=100), nullable=False),
        sa.Column('credit_limit', sa.Float(), nullable=False),
        sa.Column('drawn_balance', sa.Float(), nullable=False),
        sa.Column('utilization_rate', sa.Float(), nullable=True),
        sa.Column('ccf', sa.Float(), nullable=True),
        sa.Column('ead', sa.Float(), nullable=False),
        sa.Column('pd', sa.Float(), nullable=False),
        sa.Column('lgd', sa.Float(), nullable=False),
        sa.Column('expected_loss', sa.Float(), nullable=False),
        sa.Column('interest_rate', sa.Float(), nullable=True),
        sa.Column('origination_date', sa.String(length=20), nullable=True),
        sa.Column('maturity_date', sa.String(length=20), nullable=True),
        sa.Column('tenor_months', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['borrower_id'], ['borrowers.borrower_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('loan_id')
    )

    # Collateral
    op.create_table(
        'collateral',
        sa.Column('collateral_id', sa.String(length=50), nullable=False),
        sa.Column('loan_id', sa.String(length=50), nullable=False),
        sa.Column('collateral_type', sa.String(length=50), nullable=False),
        sa.Column('valuation_amount', sa.Float(), nullable=False),
        sa.Column('valuation_currency', sa.String(length=10), nullable=True),
        sa.Column('haircut', sa.Float(), nullable=False),
        sa.Column('valuation_date', sa.String(length=20), nullable=True),
        sa.Column('is_perfected', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['loan_id'], ['loans.loan_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('collateral_id')
    )


def downgrade() -> None:
    op.drop_table('collateral')
    op.drop_table('loans')
    op.drop_table('borrowers')
