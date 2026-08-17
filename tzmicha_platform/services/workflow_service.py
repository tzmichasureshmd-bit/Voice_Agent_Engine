"""
TZMICHA AI OS - Workflow Engine
Configurable conversation flows for AI Employees.

Instead of the AI just chatting randomly, it follows a GRAPH:
  Greet → Qualify → Pitch → Handle Objections → Book Appointment → End

Each node has:
- A goal (what to achieve in this step)
- A prompt (instructions for the AI)
- Transitions (when to move to next step)
- Fallbacks (what to do if step fails)

The AI still sounds NATURAL - it's not an IVR menu.
The workflow just guides the conversation direction.
"""

import uuid
from typing import Optional
from dataclasses import dataclass, field
from enum import Enum


class NodeType(str, Enum):
    """Types of workflow nodes"""
    GREET = "greet"
    QUALIFY = "qualify"
    PITCH = "pitch"
    FAQ = "faq"
    OBJECTION_HANDLE = "objection_handle"
    COLLECT_INFO = "collect_info"
    BOOK_APPOINTMENT = "book_appointment"
    TRANSFER = "transfer"
    ESCALATE = "escalate"
    FOLLOW_UP = "follow_up"
    END = "end"
    CUSTOM = "custom"


@dataclass
class WorkflowNode:
    """A single step in the conversation workflow"""
    id: str
    type: NodeType
    name: str
    prompt: str  # Instructions for AI at this step
    goal: str    # What to achieve
    transitions: dict = field(default_factory=dict)
    # Example: {"customer_interested": "pitch", "not_interested": "end", "has_question": "faq"}
    max_turns: int = 5  # Max turns in this node before auto-transition
    required_info: list = field(default_factory=list)  # Info to collect: ["name", "budget", "timeline"]
    fallback_node: Optional[str] = None


@dataclass
class WorkflowState:
    """Current state of a workflow during a call"""
    workflow_id: str
    current_node_id: str
    visited_nodes: list = field(default_factory=list)
    turns_in_current_node: int = 0
    collected_info: dict = field(default_factory=dict)
    is_complete: bool = False


class WorkflowService:
    """
    Manages conversation workflows.
    
    Responsibilities:
    - Load workflow graph from database/config
    - Track current position in workflow
    - Determine transitions based on conversation signals
    - Inject workflow-aware instructions into LLM prompt
    - Never make conversation feel scripted
    """

    def __init__(self):
        self._active_workflows: dict[str, WorkflowState] = {}
        self._workflow_graphs: dict[str, dict] = {}

    def load_workflow(self, workflow_id: str, graph_json: dict) -> None:
        """Load a workflow graph from JSON (stored in database)"""
        self._workflow_graphs[workflow_id] = graph_json

    def start_workflow(self, conversation_id: str, workflow_id: str) -> WorkflowState:
        """Start a workflow for a conversation"""
        graph = self._workflow_graphs.get(workflow_id)
        if not graph:
            # Use default minimal workflow
            graph = self._get_default_workflow()

        # Find start node
        nodes = graph.get("nodes", [])
        start_node = nodes[0]["id"] if nodes else "greet"

        state = WorkflowState(
            workflow_id=workflow_id,
            current_node_id=start_node,
            visited_nodes=[start_node],
        )
        self._active_workflows[conversation_id] = state
        return state

    def get_current_instructions(self, conversation_id: str) -> str:
        """
        Get workflow-aware instructions for the current step.
        This is injected into the AI's system prompt.
        
        The AI follows the guidance but keeps the conversation natural.
        """
        state = self._active_workflows.get(conversation_id)
        if not state or state.is_complete:
            return ""

        graph = self._workflow_graphs.get(state.workflow_id, self._get_default_workflow())
        nodes = {n["id"]: n for n in graph.get("nodes", [])}
        
        current_node = nodes.get(state.current_node_id)
        if not current_node:
            return ""

        node_type = current_node.get("type", "custom")
        prompt = current_node.get("prompt", "")
        goal = current_node.get("goal", "")
        required_info = current_node.get("required_info", [])

        # Build natural instruction
        instructions = [
            f"CURRENT STEP: {current_node.get('name', node_type)}",
            f"YOUR GOAL: {goal}",
        ]

        if prompt:
            instructions.append(f"GUIDANCE: {prompt}")

        if required_info:
            collected = state.collected_info
            missing = [info for info in required_info if info not in collected]
            if missing:
                instructions.append(f"STILL NEED TO FIND OUT: {', '.join(missing)}")
            if collected:
                instructions.append(f"ALREADY KNOW: {', '.join(f'{k}={v}' for k, v in collected.items())}")

        instructions.append(
            "IMPORTANT: Follow this guidance NATURALLY. Don't sound scripted. "
            "If customer goes off-topic, handle it, then gently steer back."
        )

        return "\n".join(instructions)

    def process_turn(
        self,
        conversation_id: str,
        user_message: str,
        ai_response: str,
    ) -> Optional[str]:
        """
        Process a conversation turn and check for workflow transitions.
        Returns the new node ID if transition happened, None if staying.
        """
        state = self._active_workflows.get(conversation_id)
        if not state or state.is_complete:
            return None

        state.turns_in_current_node += 1

        graph = self._workflow_graphs.get(state.workflow_id, self._get_default_workflow())
        nodes = {n["id"]: n for n in graph.get("nodes", [])}
        current_node = nodes.get(state.current_node_id)

        if not current_node:
            return None

        # Check transition signals from the conversation
        next_node = self._check_transitions(
            current_node, user_message, ai_response, state
        )

        if next_node:
            state.current_node_id = next_node
            state.visited_nodes.append(next_node)
            state.turns_in_current_node = 0

            # Check if we reached end
            if next_node == "end" or nodes.get(next_node, {}).get("type") == "end":
                state.is_complete = True

            return next_node

        # Check max turns (auto-advance if stuck too long)
        max_turns = current_node.get("max_turns", 5)
        if state.turns_in_current_node >= max_turns:
            fallback = current_node.get("fallback_node")
            transitions = current_node.get("transitions", {})
            default_next = transitions.get("default") or fallback

            if default_next:
                state.current_node_id = default_next
                state.visited_nodes.append(default_next)
                state.turns_in_current_node = 0
                return default_next

        return None

    def collect_info(self, conversation_id: str, key: str, value: str) -> None:
        """Store collected information from conversation"""
        state = self._active_workflows.get(conversation_id)
        if state:
            state.collected_info[key] = value

    def get_state(self, conversation_id: str) -> Optional[WorkflowState]:
        """Get current workflow state"""
        return self._active_workflows.get(conversation_id)

    def end_workflow(self, conversation_id: str) -> Optional[dict]:
        """End workflow and return collected data"""
        state = self._active_workflows.pop(conversation_id, None)
        if state:
            return {
                "workflow_id": state.workflow_id,
                "nodes_visited": state.visited_nodes,
                "collected_info": state.collected_info,
                "is_complete": state.is_complete,
            }
        return None

    # ===== Transition Logic =====

    def _check_transitions(
        self,
        node: dict,
        user_message: str,
        ai_response: str,
        state: WorkflowState,
    ) -> Optional[str]:
        """
        Determine if conversation should move to next workflow step.
        Uses keyword/intent detection to identify transition signals.
        """
        transitions = node.get("transitions", {})
        msg_lower = user_message.lower()

        # Check each transition condition
        for condition, target_node in transitions.items():
            if self._matches_condition(condition, msg_lower, ai_response, state):
                return target_node

        return None

    def _matches_condition(
        self,
        condition: str,
        user_message: str,
        ai_response: str,
        state: WorkflowState,
    ) -> bool:
        """Check if a transition condition is met"""
        
        # Interest signals
        if condition == "customer_interested":
            interest_words = ["yes", "sure", "interested", "tell me more", "sounds good", "ok"]
            return any(w in user_message for w in interest_words)

        if condition == "not_interested":
            reject_words = ["no", "not interested", "don't want", "stop", "bye", "busy"]
            return any(w in user_message for w in reject_words)

        if condition == "has_question":
            question_signals = ["?", "what", "how", "when", "where", "why", "tell me", "explain"]
            return any(w in user_message for w in question_signals)

        if condition == "wants_appointment":
            appt_words = ["schedule", "appointment", "meeting", "visit", "demo", "book"]
            return any(w in user_message for w in appt_words)

        if condition == "objection":
            objection_words = ["expensive", "costly", "not sure", "think about", "compare", "budget"]
            return any(w in user_message for w in objection_words)

        if condition == "angry":
            anger_words = ["angry", "frustrated", "terrible", "worst", "complaint", "manager", "escalate"]
            return any(w in user_message for w in anger_words)

        if condition == "human_requested":
            human_words = ["human", "real person", "agent", "manager", "supervisor", "transfer"]
            return any(w in user_message for w in human_words)

        if condition == "info_collected":
            required = state.collected_info
            node_required = []  # Would come from node config
            return len(required) >= len(node_required) if node_required else False

        if condition == "default":
            return True

        return False

    # ===== Templates =====

    def _get_default_workflow(self) -> dict:
        """Default conversation workflow (general sales call)"""
        return {
            "nodes": [
                {
                    "id": "greet",
                    "type": "greet",
                    "name": "Greeting",
                    "goal": "Greet naturally and confirm you're speaking to the right person",
                    "prompt": "Say hello, introduce yourself briefly. Ask if they have a moment.",
                    "max_turns": 3,
                    "transitions": {
                        "customer_interested": "qualify",
                        "not_interested": "end",
                        "has_question": "faq",
                        "default": "qualify",
                    },
                },
                {
                    "id": "qualify",
                    "type": "qualify",
                    "name": "Qualification",
                    "goal": "Understand customer needs and whether they're a good fit",
                    "prompt": "Ask about their current situation. What challenges do they face? What are they looking for?",
                    "max_turns": 5,
                    "required_info": ["needs", "timeline"],
                    "transitions": {
                        "customer_interested": "pitch",
                        "has_question": "faq",
                        "not_interested": "end",
                        "default": "pitch",
                    },
                },
                {
                    "id": "pitch",
                    "type": "pitch",
                    "name": "Value Proposition",
                    "goal": "Present how your solution solves their problem",
                    "prompt": "Based on what they told you, explain how the product/service helps. Keep it brief and relevant to THEIR needs.",
                    "max_turns": 4,
                    "transitions": {
                        "customer_interested": "book_appointment",
                        "objection": "objection_handle",
                        "has_question": "faq",
                        "not_interested": "end",
                        "default": "book_appointment",
                    },
                },
                {
                    "id": "faq",
                    "type": "faq",
                    "name": "Answer Questions",
                    "goal": "Answer customer questions using company knowledge",
                    "prompt": "Answer their question clearly and concisely using company knowledge. Then steer back to the conversation.",
                    "max_turns": 6,
                    "transitions": {
                        "customer_interested": "pitch",
                        "wants_appointment": "book_appointment",
                        "not_interested": "end",
                        "default": "pitch",
                    },
                },
                {
                    "id": "objection_handle",
                    "type": "objection_handle",
                    "name": "Handle Objections",
                    "goal": "Address concerns without being pushy",
                    "prompt": "Acknowledge their concern. Don't argue. Provide relevant information. If they're still not interested, respect that.",
                    "max_turns": 4,
                    "transitions": {
                        "customer_interested": "book_appointment",
                        "not_interested": "end",
                        "has_question": "faq",
                        "default": "end",
                    },
                },
                {
                    "id": "book_appointment",
                    "type": "book_appointment",
                    "name": "Book Appointment",
                    "goal": "Schedule a follow-up meeting or demo",
                    "prompt": "Suggest scheduling a call/meeting/demo. Ask what day and time works for them.",
                    "max_turns": 4,
                    "required_info": ["preferred_date", "preferred_time"],
                    "transitions": {
                        "info_collected": "end",
                        "not_interested": "end",
                        "default": "end",
                    },
                },
                {
                    "id": "end",
                    "type": "end",
                    "name": "End Call",
                    "goal": "End the call gracefully",
                    "prompt": "Thank them for their time. Summarize any next steps. Say goodbye naturally.",
                    "max_turns": 2,
                    "transitions": {},
                },
            ],
            "edges": [
                {"from": "greet", "to": "qualify"},
                {"from": "qualify", "to": "pitch"},
                {"from": "pitch", "to": "book_appointment"},
                {"from": "faq", "to": "pitch"},
                {"from": "objection_handle", "to": "book_appointment"},
                {"from": "book_appointment", "to": "end"},
            ],
        }

    @staticmethod
    def get_industry_templates() -> dict:
        """Pre-built workflow templates for different industries"""
        return {
            "education": {
                "name": "Education - Admission Call",
                "nodes": [
                    {"id": "greet", "type": "greet", "name": "Greeting", "goal": "Greet parent/student", "prompt": "Hello, introduce yourself as admission counselor."},
                    {"id": "understand", "type": "qualify", "name": "Understand Needs", "goal": "Know child's age, class, interests", "prompt": "Ask about the child - age, current class, what they're looking for in a school."},
                    {"id": "present", "type": "pitch", "name": "Present School", "goal": "Highlight relevant features", "prompt": "Based on their needs, share relevant programs, facilities, achievements."},
                    {"id": "fees", "type": "faq", "name": "Fee Discussion", "goal": "Share fee structure", "prompt": "Share fee structure clearly. Mention payment options if asked."},
                    {"id": "visit", "type": "book_appointment", "name": "Schedule Visit", "goal": "Book campus visit", "prompt": "Invite them for a campus tour. Ask preferred date."},
                    {"id": "end", "type": "end", "name": "End", "goal": "Close gracefully", "prompt": "Thank them, confirm visit details, say goodbye."},
                ],
            },
            "real_estate": {
                "name": "Real Estate - Property Inquiry",
                "nodes": [
                    {"id": "greet", "type": "greet", "name": "Greeting", "goal": "Greet prospect"},
                    {"id": "qualify", "type": "qualify", "name": "Understand Requirements", "goal": "Budget, location, type, timeline"},
                    {"id": "present", "type": "pitch", "name": "Present Properties", "goal": "Match properties to requirements"},
                    {"id": "visit", "type": "book_appointment", "name": "Schedule Site Visit", "goal": "Book property viewing"},
                    {"id": "end", "type": "end", "name": "End", "goal": "Close gracefully"},
                ],
            },
            "healthcare": {
                "name": "Healthcare - Appointment Booking",
                "nodes": [
                    {"id": "greet", "type": "greet", "name": "Greeting", "goal": "Greet patient"},
                    {"id": "understand", "type": "qualify", "name": "Understand Issue", "goal": "Know symptoms, department needed"},
                    {"id": "book", "type": "book_appointment", "name": "Book Appointment", "goal": "Schedule with right doctor"},
                    {"id": "instructions", "type": "custom", "name": "Pre-visit Info", "goal": "Share preparation instructions"},
                    {"id": "end", "type": "end", "name": "End", "goal": "Confirm and close"},
                ],
            },
            "insurance": {
                "name": "Insurance - Policy Inquiry",
                "nodes": [
                    {"id": "greet", "type": "greet", "name": "Greeting", "goal": "Greet prospect"},
                    {"id": "qualify", "type": "qualify", "name": "Assess Needs", "goal": "Age, income, family, existing coverage"},
                    {"id": "recommend", "type": "pitch", "name": "Recommend Plan", "goal": "Suggest suitable plan"},
                    {"id": "objection", "type": "objection_handle", "name": "Handle Concerns", "goal": "Address premium/coverage concerns"},
                    {"id": "close", "type": "collect_info", "name": "Collect Details", "goal": "Get info for quote"},
                    {"id": "end", "type": "end", "name": "End", "goal": "Close gracefully"},
                ],
            },
        }
